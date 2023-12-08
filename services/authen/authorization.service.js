"use strict";
const DbService = require("moleculer-db");
const SqlAdapter = require("moleculer-db-adapter-sequelize");
const cacher = require('../../domain/authen-utilities/cacher.js')
const tokenManager = require('../../domain/authen-utilities/verifytoken.js');
const { MoleculerError } = require("moleculer").Errors;
const mySQLHost = require('../../domain/authen-utilities/hostRemoveCharacters.js');

"use strict";

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */

module.exports = {

	mixins: [DbService],
	adapter: new SqlAdapter(process.env.DB_DATABASE, process.env.DB_USER, process.env.DB_PASSWORD, {
		host: mySQLHost,
		dialect: 'mysql',
		port: process.env.DB_PORT,
		pool: {
			max: 5,
			min: 0,
			idle: 10000
		},
		define: {
			charset: 'utf8mb4',
			collate: 'utf8mb4_unicode_ci',
			timestamps: true
		}
	}),
	model: {

	},
	name: "authorize",

	/**
	 * Settings
	 */
	settings: {

	},

	/**
	 * Dependencies
	 */
	dependencies: ["authen"],

	/**
	 * Actions
	 */
	actions: {
		authorization(ctx) {
			return new Promise((resolve, reject) => {
				// Read the token from header
				let token = ctx.params.meta.reqHeaders.token;
				let userID = tokenManager.decodeToken(token).userID
				cacher.get(this.adapter, this.broker, userID).then(res => {
					if (res != null) {
						let hasPermission = false
						for (let i = 0; i < res.role_permission.length; ++i) {
							if (res.role_permission[i].API == ctx.params.meta.endpoint) {
								hasPermission = true; break;
							}
						}
						if (hasPermission) { resolve('User có quyền với api này'); }
						else {
							reject(new MoleculerError("User không có quyền với api này", 401, 'UNAUTHORIZED_ERR', { 'message': "User không có quyền với api này" }))
						}
					}
					else
						reject(new MoleculerError("Không có thông tin login của user", 403, 'TOKEN_ERR', { 'message': "Không có thông tin login của user" }))
				})
			});
		},

		async authorizeCamUsage(ctx) {
			let userID = tokenManager.decodeToken(ctx.params.meta.reqHeaders.token).userID
			let serverList = await cacher.get(this.adapter, this.broker, 'serverList');
			let userPermission = await cacher.get(this.adapter, this.broker, userID);

			//cameraID is a groups of cameras to authorize
			console.log(serverList);
			console.log(userPermission.role_permission);

			let serverInfo

			ctx.params.meta.cameraIDList.forEach(cam => {
				console.log(cam);
				if(this.checkValueInArray(userPermission.role_permission, cam, 'CameraID'))
				{
					//user has permission to use this camera, find the corresponding server
					for(let i=0; i<serverList; ++i)
					{
						if(this.checkValueInArray(serverList[i].CameraList, cam, 'CameraID'))
						{
							serverInfo=serverList[i];
							break;
						}
					}
				}
			});
		}
	},

	/**
	 * Events
	 */
	events: {

	},

	/**
	 * Methods
	 */
	methods: {
		checkValueInArray(arrayOfObject, valueToFind, fieldName) {
			const value = obj => obj[fieldName] === valueToFind;
			console.log(arrayOfObject.some(value))
		}
	},

	/**
	 * Service created lifecycle event handler
	 */
	created() {

	},

	/**
	 * Service started lifecycle event handler
	 */
	async started() {
	},

	/**
	 * Service stopped lifecycle event handler
	 */
	async stopped() {

	}
};
