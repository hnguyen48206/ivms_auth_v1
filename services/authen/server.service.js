"use strict";
const DbService = require("moleculer-db");
const SqlAdapter = require("moleculer-db-adapter-sequelize");
const cacher = require('../../domain/authen-utilities/cacher.js')
const { MoleculerError } = require("moleculer").Errors;
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
    name: "server",

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
        createServer: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/create"
            },
            params: {
                serverID: { type: "string", min: 3, max: 20 },
                serverName: { type: "string", min: 3, max: 45 },
                serverDescription: { type: "string", min: 0, max: 45 },
                domain: { type: "string", min: 3, max: 20 },
                port: { type: "string", min: 2, max: 5 },
                http_port: { type: "string", min: 2, max: 5 },
                hls_port: { type: "string", min: 0, max: 5 },
                video_port: { type: "string", min: 0, max: 5 },
                ws_stream_port: { type: "string", min: 0, max: 5 },
                ws_ptz_port: { type: "string", min: 0, max: 5 },
                ip: { type: "string", min: 0, max: 20 },
                orgID: { type: "array" }
            },
            async handler(ctx) {

                return this.adapter.db.query(`CALL server_insert_delete_select_update('${ctx.params.orgID.toString()}','${ctx.params.ip}','${ctx.params.ws_stream_port}','${ctx.params.ws_ptz_port}','${ctx.params.hls_port}','${ctx.params.video_port}','${ctx.params.serverID}','${ctx.params.serverDescription}', '${ctx.params.serverName}','${ctx.params.domain}','${ctx.params.port}','${ctx.params.http_port}','Insert')`)
                    .then((res) => {
                        //update cache list
                        this.saveServerListToCache();
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Tạo server thành công", {});
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
        updateServer: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/update"
            },
            params: {
                serverID: { type: "string", min: 3, max: 20 },
                serverName: { type: "string", min: 3, max: 45 },
                serverDescription: { type: "string", min: 0, max: 45 },
                domain: { type: "string", min: 3, max: 20 },
                port: { type: "string", min: 2, max: 5 },
                hls_port: { type: "string", min: 0, max: 5 },
                video_port: { type: "string", min: 0, max: 5 },
                ws_stream_port: { type: "string", min: 0, max: 5 },
                ws_ptz_port: { type: "string", min: 0, max: 5 },
                ip: { type: "string", min: 0, max: 20 },
                orgID: { type: "array" },
                http_port: { type: "string", min: 2, max: 5 },
            },
            async handler(ctx) {
                return this.adapter.db.query(`CALL server_insert_delete_select_update('${ctx.params.orgID.toString()}','${ctx.params.ip}','${ctx.params.ws_stream_port}','${ctx.params.ws_ptz_port}','${ctx.params.hls_port}','${ctx.params.video_port}','${ctx.params.serverID}','${ctx.params.serverDescription}', '${ctx.params.serverName}','${ctx.params.domain}','${ctx.params.port}','${ctx.params.http_port}','Update')`)
                    .then((res) => {
                        //update cache list
                        this.saveServerListToCache();
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Cập nhật server thành công", {});
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
        deleteServer: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/delete"
            },
            params: {
                serverID: { type: "string", min: 3, max: 20 }
            },
            async handler(ctx) {
                let check = await this.adapter.db.query(`CALL check_if_server_has_cam('${ctx.params.serverID}')`);
                if(check.length>0)
                return resultHandler(0, "Xóa server không thành công do server đang quản lý ít nhất 1 camera", {});
                else
                return this.adapter.db.query(`CALL server_insert_delete_select_update('','','','','','','${ctx.params.serverID}','', '','','','','Delete')`)
                    .then((res) => {
                        //update cache list
                        this.saveServerListToCache();
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Xóa server thành công", {});
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
        selectAllServer: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/get-all"
            },
            params: {
                filter: { type: "array" }
            },
            async handler(ctx) {
                return this.adapter.db.query(`CALL server_insert_delete_select_update('','','','','','', '','','','','','','Select')`)
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

                            // for(let i=0; i< result.length; ++i)
                            // {
                            //     if(result[i].OrgList != null)
                            //     {
                            //         let temp = result[i].OrgList.map(function(item) {
                            //             return item['OrgID'];
                            //           });
                            //         result[i].OrgList = temp;
                            //     }
                                
                            // }

                            return resultHandler(1, "Lấy danh sách server thành công", result);
                        } catch (error) {
                            console.log('Filter Fail---------------------------------------')
                            console.log(error)
                            return resultHandler(1, "Lấy danh sách server thành công", result);
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
        assignMultipleCamerasToServer: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/assign-update-multiple-cameras-to-server"
            },
            params: {
                serverID: { type: "string", min: 3, max: 20 },
                cameraID: { type: "array" }
            },
            async handler(ctx) {

                return this.adapter.db.query(`CALL add_multiple_cameras_to_server('${ctx.params.cameraID.toString()}','${ctx.params.serverID}')`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Update cams vào server thành công", {});
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
        selectAllServerTreeGrid: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/get-all-tree-grid"
            },
            params: {
                filter: { type: "array" }
            },
            async handler(ctx) {
                return this.adapter.db.query(`CALL server_insert_delete_select_update('','','','','','', '','','','','','','Select')`)
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
                            return resultHandler(1, "Lấy danh sách server thành công", this.reformatServerData(result));
                        } catch (error) {
                            console.log('Filter Fail---------------------------------------')
                            console.log(error)
                            return resultHandler(1, "Lấy danh sách server thành công", this.reformatServerData(result));
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
            this.adapter.db.query(`CALL server_insert_delete_select_update('','','','','','', '','','','','','','Select')`)
                .then((res) => {
                    console.log('get server list ok')
                    cacher.set(this.adapter, this.broker, 'serverList', res);
                }
                )
                .catch(err => {
                    console.log(err);
                });
        },
        reformatServerData(array) {
            let returnArray = []
            for (let i = 0; i < array.length; ++i) {
                let tempObject =
                {
                    data: null,
                    children: []
                }

                tempObject.data = array[i];

                if (array[i].OrgList != null)
                    tempObject.data.OrganizationID = '' + array[i].OrgList.length
                else
                    tempObject.data.OrganizationID = '0';

                if (array[i].CameraList != null)
                    tempObject.data.CameraID = '' + array[i].CameraList.length
                else
                    tempObject.data.CameraID = '0';

                if (array[i].OrgList != null && array[i].CameraList != null) {
                    if (array[i].OrgList.length >= array[i].CameraList.length) {
                        for (let j = 0; j < array[i].OrgList.length; ++j) {
                            let data = {
                                data: {
                                    "CameraID": "",
                                    "ServerID": "",
                                    "ServerName": "",
                                    "ServerDescription": "",
                                    "Domain": "",
                                    "Port": "",
                                    "HLSPort": "",
                                    "VideoPort": "",
                                    "CreatedOn": "",
                                    "ModifiedOn": "",
                                    "WSStreamPort": "",
                                    "WSPTZPort": "",
                                    "HTTPStreamPort":"",
                                    "OrganizationID": ""
                                }
                            }
                            data.data.OrganizationID = array[i].OrgList[j].OrgID
                            data.data.CameraID = array[i].CameraList[j]?.CameraID??''

                            delete data.OrgList;
                            delete data.CameraList;
                            delete data.IPAddress;
                            tempObject.children.push(data);
                        }
                    }
                    else {
                        for (let j = 0; j < array[i].CameraList.length; ++j) {
                            let data = {
                                data: {
                                    "CameraID": "",
                                    "ServerID": "",
                                    "ServerName": "",
                                    "ServerDescription": "",
                                    "Domain": "",
                                    "Port": "",
                                    "HLSPort": "",
                                    "VideoPort": "",
                                    "CreatedOn": "",
                                    "ModifiedOn": "",
                                    "WSStreamPort": "",
                                    "WSPTZPort": "",
                                    "HTTPStreamPort":"",
                                    "OrganizationID": ""
                                }
                            }
                            data.data.CameraID = array[i].CameraList[j].CameraID
                            data.data.OrganizationID = array[i].OrgList[j]?.OrgID??''

                            delete data.OrgList;
                            delete data.CameraList;
                            delete data.IPAddress;
                            tempObject.children.push(data);
                        }
                    }
                }
                else if(array[i].OrgList == null && array[i].CameraList != null)
                {
                    for (let j = 0; j < array[i].CameraList.length; ++j) {
                        let data = {
                            data: {
                                "CameraID": "",
                                "ServerID": "",
                                "ServerName": "",
                                "ServerDescription": "",
                                "Domain": "",
                                "Port": "",
                                "HLSPort": "",
                                "VideoPort": "",
                                "CreatedOn": "",
                                "ModifiedOn": "",
                                "WSStreamPort": "",
                                "WSPTZPort": "",
                                "HTTPStreamPort":"",
                                "OrganizationID": ""
                            }
                        }
                        data.data.CameraID = array[i].CameraList[j].CameraID
                        data.data.OrganizationID = ''

                        delete data.OrgList;
                        delete data.CameraList;
                        delete data.IPAddress;
                        tempObject.children.push(data);
                    }
                }
                else if(array[i].OrgList != null && array[i].CameraList == null)
                {
                    for (let j = 0; j < array[i].OrgList.length; ++j) {
                        let data = {
                            data: {
                                "CameraID": "",
                                "ServerID": "",
                                "ServerName": "",
                                "ServerDescription": "",
                                "Domain": "",
                                "Port": "",
                                "HLSPort": "",
                                "VideoPort": "",
                                "CreatedOn": "",
                                "ModifiedOn": "",
                                "WSStreamPort": "",
                                "WSPTZPort": "",
                                "HTTPStreamPort":"",
                                "OrganizationID": ""
                            }
                        }
                        data.data.OrganizationID = array[i].OrgList[j].OrgID
                        data.data.CameraID = ''

                        delete data.OrgList;
                        delete data.CameraList;
                        delete data.IPAddress;
                        tempObject.children.push(data);
                    }
                }
                delete tempObject.data.OrgList;
                delete tempObject.data.CameraList;
                delete tempObject.data.IPAddress;

                returnArray.push(tempObject);

            }
            return returnArray;
        },
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
        //get serverList and save in cache right after the service has started.
        this.saveServerListToCache();
    },

    /**
     * Service stopped lifecycle event handler
     */
    async stopped() {

    }
};
