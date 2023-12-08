"use strict";
const DbService = require("moleculer-db");
const SqlAdapter = require("moleculer-db-adapter-sequelize");
const cacher = require('../../domain/authen-utilities/cacher.js')
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
    name: "role-per-cam-serv",
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
        createRolePerCamServ: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/create"
            },
            params: {
                roleID: { type: "string", min: 3, max: 20 },
                permissionID: { type: "string", min: 3, max: 20 },
                cameraID: { type: "string", min: 3, max: 20 },
                serviceID: { type: "string", min: 1, max: 20 },

            },
            async handler(ctx) {

                return this.adapter.db.query(`CALL cam_service_role_permission_insert_delete_select('${ctx.params.roleID}','${ctx.params.permissionID}','${ctx.params.cameraID}','${ctx.params.serviceID}','Insert')`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Gán cam và services vào role-permission thành công", {});
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
        removeRolePerCamServ: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/remove"
            },
            params: {
                removeList: { type: "array" }
            },
            async handler(ctx) {
                let checkInputArrayStructure = false
                let arrayOfPromises = []
                for (let i = 0; i < ctx.params.removeList.length; ++i) {
                    if (ctx.params.removeList[i].hasOwnProperty('roleID') && ctx.params.removeList[i].hasOwnProperty('permissionID') && ctx.params.removeList[i].hasOwnProperty('cameraID') && ctx.params.removeList[i].hasOwnProperty('serviceID')) {
                        let promise = this.adapter.db.query(`CALL cam_service_role_permission_insert_delete_select('${ctx.params.removeList[i].roleID}','${ctx.params.removeList[i].permissionID}','${ctx.params.removeList[i].cameraID}','${ctx.params.removeList[i].serviceID}','Delete')`)
                        arrayOfPromises.push(promise.catch((err) => err));
                        checkInputArrayStructure = true;
                    }
                    else { checkInputArrayStructure = false; break; }
                }
                if (checkInputArrayStructure) {
                    if (arrayOfPromises.length > 0) {
                        await Promise.all(arrayOfPromises).then((values) => {
                            // console.log(values);
                        })
                        await cacher.updateCurrentUserCachedPermissionList(ctx.meta.reqHeaders.token, this.adapter, this.broker);


                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Remove cam và services ra khỏi role-permission thành công", {});
                    }
                    else
                        return resultHandler(0, "Không có thông tin đầu vào", {});
                }
                else {
                    let error = new MoleculerError('Lỗi hệ thống', 500, 'INPUT_ERROR');
                    return Promise.reject(error);
                }


                // return this.adapter.db.query(`CALL cam_service_role_permission_insert_delete_select('${ctx.params.roleID}','${ctx.params.permissionID}','${ctx.params.cameraID}','${ctx.params.serviceID}','Delete')`)
                //     .then((res) => {
                //         return resultHandler(1, "Remove cam và services ra khỏi role-permission thành công", {});
                //     }
                //     )
                //     .catch(err => {
                //         console.log(err);
                //         let error = () => {
                        //     if(err.parent.sqlMessage)
                        //     return new MoleculerError('Lỗi hệ thống', 500, 'DB_ERROR', err.parent.sqlMessage);
                        //     else return new MoleculerError('Lỗi hệ thống', 500, 'DB_ERROR')
                        // };
                //         return Promise.reject(error);
                //     });

            }
        },
        selectMultiple:
        {
            rest: {
                method: "GET",
                path: "/get-multiple"
            },
            async handler(ctx) {


                let userID = tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID;
                let userRolePermission = await cacher.get(this.adapter, this.broker, userID)

                return this.adapter.db.query(`CALL cam_service_role_permission_insert_delete_select('all','all','all','all','Select')`)
                    .then((res) => {
                        let result = res;
                        // try {
                        //     var check = res.filter(function(aItem) {
                        //         return userRolePermission.role_permission.find(function(bItem) {
                        //           return aItem.RoleID === bItem.RoleID
                        //         })
                        //       })
                        //       result=check;                                
                        // } catch (error) {
                        //     console.log(error)
                        // }
                        this.broker.call("logging.logUserAction", {
                            userID: userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Lấy danh sách thành công", result);
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
        getMultiple_TreeGrid:
        {
            rest: {
                method: "GET",
                path: "/get-multiple-treegrid"
            },
            async handler(ctx) {
                return this.adapter.db.query(`select * from RolePermissionCameraServices`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Lấy danh sách thành công", this.getMultiple_TreeGrid_Formatter(res[0]));
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
        createRolePerCamServWithMultiplePermission: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/create-with-multiple-per"
            },
            params: {
                roleID: { type: "string", min: 3, max: 20 },
                permissionID: { type: "array" },
                cameraID: { type: "string", min: 3, max: 20 },
                serviceID: { type: "string", min: 1, max: 20 },

            },
            async handler(ctx) {
                try {
                    await this.adapter.db.query(`CALL create_role_per_cam_serv_with_multiple_per('${ctx.params.permissionID.toString()}','${ctx.params.roleID}','${ctx.params.cameraID}','${ctx.params.serviceID}')`)
                    await cacher.updateCurrentUserCachedPermissionList(ctx.meta.reqHeaders.token, this.adapter, this.broker);

                    this.broker.call("logging.logUserAction", {
                        userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                        action: ctx.meta.endpoint,
                        data: JSON.stringify(ctx.params),
                        comment: ctx.meta.clientIp
                    });
                    return resultHandler(1, "Gán cam và services vào role-permission thành công", {});

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
        updateRolePerCamServWithMultiplePermission: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/update-with-multiple-per"
            },
            params: {
                roleID: { type: "string", min: 3, max: 20 },
                permissionID: { type: "array" },
                cameraID: { type: "string", min: 3, max: 20 },
                serviceID: { type: "string", min: 1, max: 20 }
            },
            async handler(ctx) {

                try {
                    await this.adapter.db.query(`CALL update_role_per_cam_serv_with_multiple_per('${ctx.params.permissionID.toString()}','${ctx.params.roleID}','${ctx.params.cameraID}','${ctx.params.serviceID}')`)
                    await cacher.updateCurrentUserCachedPermissionList(ctx.meta.reqHeaders.token, this.adapter, this.broker);

                    this.broker.call("logging.logUserAction", {
                        userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                        action: ctx.meta.endpoint,
                        data: JSON.stringify(ctx.params),
                        comment: ctx.meta.clientIp
                    });
                    return resultHandler(1, "Update cam và services vào role-permission thành công", {});

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

        getMultiple_TreeGrid_Formatter(array) {
            let returnArray = [];
            const groupByKey = (list, key, { omitKey = false }) => list.reduce((hash, { [key]: value, ...rest }) => ({ ...hash, [value]: (hash[value] || []).concat(omitKey ? { ...rest } : { [key]: value, ...rest }) }), {})
            let groupedObject = groupByKey(array, 'CameraID', { omitKey: true });

            for (const property in groupedObject) {

                let data = {
                    data: {
                        "CameraID": property.toString(),
                        "ServiceID": '',
                        "PermissionID": '',
                        "RoleID": '',
                        "CreatedOn": "",
                        "ModifiedOn": ""
                    },
                    children: []
                }

                data.children = this.getRolePermission_TreeGrid_Formatter(groupedObject[property])
                data.data.ServiceID = data.children.length

                returnArray.push(data)
            }
            return returnArray

        },
        getRolePermission_TreeGrid_Formatter(array) {
            let returnArray = [];
            const groupByKey = (list, key, { omitKey = false }) => list.reduce((hash, { [key]: value, ...rest }) => ({ ...hash, [value]: (hash[value] || []).concat(omitKey ? { ...rest } : { [key]: value, ...rest }) }), {})
            let groupedObject = groupByKey(array, 'ServiceID', { omitKey: true });

            for (const property in groupedObject) {
                // console.log(`${property}: ${groupedObject[property]}`);
                let data = {
                    data: {
                        "CameraID": '',
                        "ServiceID": property.toString(),
                        "PermissionID": '',
                        "RoleID": '',
                        "CreatedOn": "",
                        "ModifiedOn": ""
                    },
                    children: []
                }
                for (let i = 0; i < groupedObject[property].length; ++i) {
                    groupedObject[property][i]["CameraID"] = ''
                    groupedObject[property][i]["ServiceID"] = ''
                    data.children.push({ "data": groupedObject[property][i] })
                }
                returnArray.push(data)
            }
            return returnArray
        },
        isObject(obj) {
            return obj != null && obj.constructor.name === "Object"
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
    },

    /**
     * Service stopped lifecycle event handler
     */
    async stopped() {

    }
};
