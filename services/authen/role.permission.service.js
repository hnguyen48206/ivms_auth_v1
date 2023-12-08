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
    name: "role-permission",
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
        assignPermissionToRole: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/assign-permission-to-role"
            },
            params: {
                roleID: { type: "string", min: 3, max: 20 },
                permissionID: { type: "string", min: 3, max: 20 }
            },
            async handler(ctx) {
                try {
                    await this.adapter.db.query(`CALL role_permission_insert_delete_select('${ctx.params.roleID}','${ctx.params.permissionID}','Insert')`)
                      //Tự động cập nhật quyền này cho tất cả các user đang có role tương ứng
                      await this.adapter.db.query(`CALL autoupdate_userrolepermission_new_permission_added('${ctx.params.roleID}','${ctx.params.permissionID}','Insert')`)
                      await cacher.updateCurrentUserCachedPermissionList(ctx.meta.reqHeaders.token, this.adapter, this.broker);

                      this.broker.call("logging.logUserAction", {
                        userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                        action: ctx.meta.endpoint,
                        data: JSON.stringify(ctx.params),
                        comment: ctx.meta.clientIp
                    });
                      return resultHandler(1, "Gán quyền vào role thành công", {});

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
        removePermissionFromRole: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/remove-permission-from-role"
            },
            params: {
                roleID: { type: "string", min: 3, max: 20 },
                permissionID: { type: "string", min: 3, max: 20 }
            },
            async handler(ctx) {
                try {
                    await this.adapter.db.query(`CALL role_permission_insert_delete_select('${ctx.params.roleID}','${ctx.params.permissionID}','Delete')`)
                    await cacher.updateCurrentUserCachedPermissionList(ctx.meta.reqHeaders.token, this.adapter, this.broker);
                    
                    this.broker.call("logging.logUserAction", {
                        userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                        action: ctx.meta.endpoint,
                        data: JSON.stringify(ctx.params),
                        comment: ctx.meta.clientIp
                    });
                    return resultHandler(1, "Remove quyen khoi role thành công", {});

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
        getRolePermission_TreeGrid:
        {
            rest: {
                method: "GET",
                path: "/get-multiple-treegrid"
            },
            async handler(ctx) {

                return this.adapter.db.query(`call get_role_per_tree_grid()`)
                    .then((res) => {

                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });

                        console.log(res.length)
                        return resultHandler(1, "Lấy danh sách thành công", this.getRolePermission_TreeGrid_Formatter(res));
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
        assignMultiplePermissionToRole: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/assign-multiple-permission-to-role"
            },
            params: {
                roleID: { type: "string", min: 3, max: 20 },
                permissionID: { type: "array" }
            },
            async handler(ctx) {
                let token = ctx.meta.reqHeaders.token;
                let userID = tokenManager.decodeToken(token).userID;

                try {
                    await  this.adapter.db.query(`CALL add_multiple_per_to_role('${ctx.params.permissionID}','${ctx.params.roleID}')`)
                    await this.adapter.db.query(`CALL autoupdate_rolepermission_to_user('${ctx.params.roleID}','${userID}')`)
                    await cacher.updateCurrentUserCachedPermissionList(ctx.meta.reqHeaders.token, this.adapter, this.broker);

                    this.broker.call("logging.logUserAction", {
                        userID: userID,
                        action: ctx.meta.endpoint,
                        data: JSON.stringify(ctx.params),
                        comment: ctx.meta.clientIp
                    });
                    return resultHandler(1, "Gán quyền vào role thành công", {});

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
        getAllRolePermission: {
            /**only one token per admin */
            rest: {
                method: "GET",
                path: "/get-all"
            },
            async handler(ctx) {

                return this.adapter.db.query(`call role_per_select_all()`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Lấy danh sách thành công", res);
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
        getRolePermission_TreeGrid_Formatter(array) {
            // console.log(array)
            let returnArray = [];
            const groupByKey = (list, key, { omitKey = false }) => list.reduce((hash, { [key]: value, ...rest }) => ({ ...hash, [value]: (hash[value] || []).concat(omitKey ? { ...rest } : { [key]: value, ...rest }) }), {})
            let groupedObject = groupByKey(array, 'RoleID', { omitKey: true });

            for (const property in groupedObject) {
                // console.log(`${property}: ${groupedObject[property]}`);
                let data = {
                    data: {
                        "PermissionID": groupedObject[property].length.toString(),
                        "RoleID": property.toString(),
                        "CreatedOn": "",
                        "ModifiedOn": ""
                    },
                    children: []
                }
                for (let i = 0; i < groupedObject[property].length; ++i) {
                    groupedObject[property][i]["RoleID"] = ''
                    data.children.push({ "data": groupedObject[property][i] })
                }
                returnArray.push(data)
            }
            return returnArray
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
