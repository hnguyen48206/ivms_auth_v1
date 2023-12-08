"use strict";
const DbService = require("moleculer-db");
const SqlAdapter = require("moleculer-db-adapter-sequelize");
const cacher = require('../../domain/authen-utilities/cacher.js')
const { MoleculerError } = require("moleculer").Errors;
const resultHandler = require('../../domain/authen-utilities/resulthandler.js');
const tokenManager = require('../../domain/authen-utilities/verifytoken.js');
const mySQLHost = require('../../domain/authen-utilities/hostRemoveCharacters.js');
const base64Tools = require('../../domain/authen-utilities/base64_tools.js')
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
    name: "camera-service",
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
        assignSerToCam: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/assign-service-to-cam"
            },
            params: {
                cameraID: { type: "string", min: 3, max: 20 },
                serviceID: { type: "string", min: 1, max: 100 },
                cameraConfig: { type: "string" }
            },
            async handler(ctx) {
    
                try {
                    ctx.params.cameraConfig = base64Tools.encode(ctx.params.cameraConfigs);

                    await this.adapter.db.query(`CALL cam_serive_insert_delete_select('${ctx.params.cameraConfig}','${ctx.params.cameraID}','${ctx.params.serviceID}','')`)
                    await cacher.updateCurrentUserCachedPermissionList(ctx.meta.reqHeaders.token, this.adapter, this.broker);

                    this.broker.call("logging.logUserAction", {
                        userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                        action: ctx.meta.endpoint,
                        data: JSON.stringify(ctx.params),
                        comment: ctx.meta.clientIp
                    });
                    return resultHandler(1, "Gán service vào camera thành công", {});

                } catch (err) {
                    console.log(err)
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
                    }
              
            }
        },
        removeSerFromCam: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/remove-service-from-cam"
            },
            params: {
                cameraID: { type: "string", min: 3, max: 20 },
                serviceID: { type: "string", min: 1, max: 100 }
            },
            async handler(ctx) {  
                try {
                    await this.adapter.db.query(`CALL cam_serive_insert_delete_select('', '${ctx.params.cameraID}','${ctx.params.serviceID}','Delete')`)
                    await cacher.updateCurrentUserCachedPermissionList(ctx.meta.reqHeaders.token, this.adapter, this.broker);

                    this.broker.call("logging.logUserAction", {
                        userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                        action: ctx.meta.endpoint,
                        data: JSON.stringify(ctx.params),
                        comment: ctx.meta.clientIp
                    });
                    return resultHandler(1, "Remove service khỏi camera thành công", {});

                } catch (err) {
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
                    }            
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
