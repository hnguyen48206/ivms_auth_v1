"use strict";
const DbService = require("moleculer-db");
const SqlAdapter = require("moleculer-db-adapter-sequelize");
const { MoleculerError } = require("moleculer").Errors;
const resultHandler = require('../../domain/authen-utilities/resulthandler.js');
const tokenManager = require('../../domain/authen-utilities/verifytoken.js');
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
    name: "organization-camera",
    settings: {
    },

    /**
     * Dependencies
     */
    dependencies: ["authen","authorize"],

    /**
     * Actions 
     */
    actions: {
        assignCamToOrg: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/assign-cam-to-org"
            },
            params: {
                cameraID: { type: "string", min: 3, max: 20 },
                orgID: { type: "string", min: 3, max: 20 }
            },
            async handler(ctx) {
      
                    return this.adapter.db.query(`CALL org_cam_insert_delete_select('${ctx.params.cameraID}','${ctx.params.orgID}','Insert')`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Gán camera vào org thành công", {});
                    } 
                    )
                    .catch(err => { 
                        let error = () => {
                              try {
                                console.log('abc', err.parent.sqlMessage)
                                return new MoleculerError('Lỗi hệ thống', 500, 'DB_ERROR', err.parent.sqlMessage);
                            } catch (error) {
                                console.log(err);
                                return new MoleculerError('Lỗi hệ thống', 500, 'LG_ERROR')
                            }
                        };
                        return Promise.reject(error());
                    });
        
            }
        },
        removeCamFromOrg: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/remove-cam-from-org"
            },
            params: {
                cameraID: { type: "string", min: 3, max: 20 },
                orgID: { type: "string", min: 3, max: 20 }
            },
            async handler(ctx) {
     
                    return this.adapter.db.query(`CALL org_cam_insert_delete_select('${ctx.params.cameraID}','${ctx.params.orgID}','Delete')`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Remove camera khỏi org thành công", {});
                    } 
                    )
                    .catch(err => { 
                        let error = () => {
                              try {
                                console.log('abc', err.parent.sqlMessage)
                                return new MoleculerError('Lỗi hệ thống', 500, 'DB_ERROR', err.parent.sqlMessage);
                            } catch (error) {
                                console.log(err);
                                return new MoleculerError('Lỗi hệ thống', 500, 'LG_ERROR')
                            }
                        };
                        return Promise.reject(error());
                    });
   
            }
        },
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
