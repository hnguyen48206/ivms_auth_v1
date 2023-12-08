"use strict";
const DbService = require("moleculer-db");
const SqlAdapter = require("moleculer-db-adapter-sequelize");
const { MoleculerError } = require("moleculer").Errors;
const cacher = require('../../domain/authen-utilities/cacher.js')
const resultHandler = require('../../domain/authen-utilities/resulthandler.js');
const tokenManager = require('../../domain/authen-utilities/verifytoken.js');
const filterArray = require('../../domain/authen-utilities/result_filter.js')
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
    name: "service",

    /**
     * Settings
     */
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
        createServ: {
            rest: {
                method: "POST",
                path: "/create"
            },
            params: {
                serviceID: { type: "string", min: 1, max: 20 },
                serviceDescription: { type: "string", min: 0, max: 45 },
            },
            async handler(ctx) {

                    return this.adapter.db.query(`CALL service_insert_delete_select_update('${ctx.params.serviceID}','${ctx.params.serviceDescription}','Insert')`)
                        .then((res) => {
                            this.broker.call("logging.logUserAction", {
                                userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                                action: ctx.meta.endpoint,
                                data: JSON.stringify(ctx.params),
                                comment: ctx.meta.clientIp
                            });
                            return resultHandler(1, "Tạo service thành công", {});
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
        updateServ: {
            rest: {
                method: "POST",
                path: "/update"
            },
            params: {
                serviceID: { type: "string", min: 1, max: 20 },
                serviceDescription: { type: "string", min: 0, max: 45 },
            },
            async handler(ctx) {
    
                    return this.adapter.db.query(`CALL service_insert_delete_select_update('${ctx.params.serviceID}','${ctx.params.serviceDescription}','Update')`)
                        .then((res) => {
                            this.broker.call("logging.logUserAction", {
                                userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                                action: ctx.meta.endpoint,
                                data: JSON.stringify(ctx.params),
                                comment: ctx.meta.clientIp
                            });
                            return resultHandler(1, "Update service thành công", {});
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
        deleteServ: {
            rest: {
                method: "POST",
                path: "/delete"
            },
            params: {
                serviceID: { type: "string", min: 1, max: 20 }
            },
            async handler(ctx) {
                try {
                    await this.adapter.db.query(`CALL service_insert_delete_select_update('${ctx.params.serviceID}','','Delete')`)
                    await cacher.updateCurrentUserCachedPermissionList(ctx.meta.reqHeaders.token, this.adapter, this.broker);

                    this.broker.call("logging.logUserAction", {
                        userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                        action: ctx.meta.endpoint,
                        data: JSON.stringify(ctx.params),
                        comment: ctx.meta.clientIp
                    });
                    return resultHandler(1, "Xóa service thành công", {});

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
        selectAll:
        {
            rest: {
                method: "POST",
                path: "/get-all"
            },
            params: {
                filter: { type: "array" }
            },
            async handler(ctx) {
              
                    return this.adapter.db.query(`CALL service_insert_delete_select_update('','','Select')`)
                        .then((res) => {
                            this.broker.call("logging.logUserAction", {
                                userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                                action: ctx.meta.endpoint,
                                data: JSON.stringify(ctx.params),
                                comment: ctx.meta.clientIp
                            });

                            let result = res;
                            try {
                                if (ctx.params.filter.length > 0) {
                                    result = filterArray.filterArray(result, ctx.params.filter)
                                }
                                return resultHandler(1, "Lấy danh sách dịch vụ cam thành công", result);
                            } catch (error) {
                                console.log('Filter Fail---------------------------------------')
                                console.log(error)
                                return resultHandler(1, "Lấy danh sách dịch vụ cam thành công", result);
                            }                        }
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
        selectServiceByID: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/get-by-id"
            },
            params: {
                serviceID: { type: "string", min: 1, max: 20 }
                    },
            async handler(ctx) {
                return this.adapter.db.query(`SELECT * FROM Services WHERE ServiceID='${ctx.params.serviceID}'`)
                .then((res) => {
                    this.broker.call("logging.logUserAction", {
                        userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                        action: ctx.meta.endpoint,
                        data: JSON.stringify(ctx.params),
                        comment: ctx.meta.clientIp
                    });
                    
                    if(res[0].length>0)
                    return resultHandler(1, "Lấy dịch vụ camera thành công", res[0]);
                    else
                    return resultHandler(0, "Không tìm thấy dữ liệu",{});
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
