"use strict";
const DbService = require("moleculer-db");
const SqlAdapter = require("moleculer-db-adapter-sequelize");
const { MoleculerError } = require("moleculer").Errors;
const cacher = require('../../domain/authen-utilities/cacher.js')
const resultHandler = require('../../domain/authen-utilities/resulthandler.js')
const filterArray = require('../../domain/authen-utilities/result_filter.js')
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
    name: "camgroup",

    /**
     * Settings
     */
    settings: {

    },

    /**
     * Dependencies
     */
    dependencies: ["authen", "authorize"],

    /**
     * Actions
     */
    actions: {
        createCamGroup: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/create"
            },
            params: {
                camGroupName: { type: "string", min: 3, max: 100 },
                camGroupDescription: { type: "string", min: 0, max: 200 }
            },
            async handler(ctx) {

                let token = ctx.meta.reqHeaders.token;
                let userID = tokenManager.decodeToken(token).userID
                return this.adapter.db.query(`CALL camgroup_insert_delete_select_update(0,'${ctx.params.camGroupName}', '${ctx.params.camGroupDescription}','${userID}','Insert')`)
                    .then((res) => {
                        //update cache list
                        this.saveServerListToCache();
                        this.broker.call("logging.logUserAction", {
                            userID: userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Tạo loại camera thành công", {});
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
        updateCamGroup: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/update"
            },
            params: {
                camGroupID: {
                    type: "number",
                    integer: true, min: 0
                },
                camGroupName: { type: "string", min: 3, max: 100 },
                camGroupDescription: { type: "string", min: 0, max: 200 }
            },
            async handler(ctx) {
                return this.adapter.db.query(`CALL camgroup_insert_delete_select_update(${ctx.params.camGroupID},'${ctx.params.camGroupName}', '${ctx.params.camGroupDescription}','','Update')`)
                    .then((res) => {
                        //update cache list
                        this.saveServerListToCache();
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Cập nhật loại cam thành công", {});
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
        deleteCamGroup: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/delete"
            },
            params: {
                camGroupID: {
                    type: "number",
                    integer: true, min: 0
                }
            },
            async handler(ctx) {

                return this.adapter.db.query(`CALL camgroup_insert_delete_select_update(${ctx.params.camGroupID},'','','','Delete')`)
                    .then((res) => {
                        //update cache list
                        this.saveServerListToCache();
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Xóa loại cam thành công", {});
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
        selectAllCamGroup: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/get-all"
            },
            params: {
                filter: { type: "array" }
            },
            async handler(ctx) {
                return this.adapter.db.query(`CALL camgroup_insert_delete_select_update(0,'', '','','Select')`)
                    .then((res) => {
                        let result = res;
                        for (let i = 0; i < result.length; ++i) {
                            if (result[i].CameraList != null)
                                result[i].CameraList = result[i].CameraList.filter(camera => camera.CameraID != null);
                        }

                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        try {
                            if (ctx.params.filter.length > 0) {
                                result = filterArray.filterArray(result, ctx.params.filter)
                            }
                            return resultHandler(1, "Lấy danh sách loại cam thành công", result);
                        } catch (error) {
                            console.log('Filter Fail---------------------------------------')
                            console.log(error)
                            return resultHandler(1, "Lấy danh sách loại cam thành công", result);
                        }
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
        assignMultipleCamerasToGroup: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/assign-update-multiple-cameras-to-group"
            },
            params: {
                camGroupID: {
                    type: "number",
                    integer: true, min: 0
                },
                cameraID: { type: "array" }
            },
            async handler(ctx) {

                return this.adapter.db.query(`CALL add_update_multiple_cameras_to_camgroup('${ctx.params.cameraID.toString()}','${ctx.params.camGroupID}')`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Update cams vào group thành công", {});
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
        saveServerListToCache() {
            this.adapter.db.query(`CALL server_insert_delete_select_update('','','','','','','', '','','','','','Select')`)
                .then((res) => {
                    console.log('get server list ok')
                    cacher.set(this.adapter, this.broker, 'serverList', res);
                }
                )
                .catch(err => {
                    console.log(err);
                });

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
