"use strict";
const DbService = require("moleculer-db");
const SqlAdapter = require("moleculer-db-adapter-sequelize");
const Sequelize = require("sequelize");
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
        name: "Roles",
        define: {
            RoleID: Sequelize.STRING,
            RoleDescription: Sequelize.STRING,
            IsDefault: Sequelize.BOOLEAN,
            CreatedOn: Sequelize.DATE,
            ModifiedOn: Sequelize.DATE,
        },
        options: {
            // Options from http://docs.sequelizejs.com/manual/tutorial/models-definition.html
        }
    },
    name: "role",

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
        createRole: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/create"
            },
            params: {
                roleID: { type: "string", min: 3, max: 20 },
                roleDescription: { type: "string", min: 0, max: 45 },
                isDefault: { type: "number", integer: true, max: 1, min: 0 },
            },
            async handler(ctx) {
                let userID = tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID;
                return this.adapter.db.query(`CALL role_insert_update_select('${userID}','${ctx.params.roleID}','${ctx.params.roleDescription}', '${ctx.params.isDefault}','Insert')`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Tạo vai trò thành công", {});
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
        createUpdateRoleWithMultiplePermissions: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/create-update-with-permissions"
            },
            params: {
                roleID: { type: "string", min: 3, max: 20 },
                roleDescription: { type: "string", min: 0, max: 45 },
                isDefault: { type: "number", integer: true, max: 1, min: 0 },
                permissionID: { type: "array" }
            },
            async handler(ctx) {
                let userID = tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID;

                try {
                    await this.adapter.db.query(`CALL create_update_roles_with_permissions('${userID}','${ctx.params.roleID}','${ctx.params.roleDescription}', '${ctx.params.isDefault}','${ctx.params.permissionID.toString()}')`);
                    await cacher.updateCurrentUserCachedPermissionList(ctx.meta.reqHeaders.token, this.adapter, this.broker);

                    this.broker.call("logging.logUserAction", {
                        userID: userID,
                        action: ctx.meta.endpoint,
                        data: JSON.stringify(ctx.params),
                        comment: ctx.meta.clientIp
                    });
                    return resultHandler(1, "Tạo/ cập nhật vai trò với quyền thành công", {});

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
        updateRole: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/update"
            },
            params: {
                roleID: { type: "string", min: 3, max: 20 },
                roleDescription: { type: "string", min: 0, max: 45 },
                isDefault: { type: "number", integer: true, max: 1, min: 0 },
            },
            async handler(ctx) {
                let userID = tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID;
                return this.adapter.db.query(`CALL role_insert_update_select('${userID}','${ctx.params.roleID}','${ctx.params.roleDescription}', '${ctx.params.isDefault}','Update')`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Cập nhật vai trò thành công", {});
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
        deleteRole: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/delete"
            },
            params: {
                roleID: { type: "string", min: 3, max: 20 }
            },
            async handler(ctx) {

                try {
                    let check = await this.adapter.db.query(`CALL check_if_role_has_been_assgined('${ctx.params.roleID}')`);
                    if (check.length > 0)
                        return resultHandler(0, "Xóa vai trò không thành công do đã được gán cho ít nhất 1 user", {});
                    else {
                        await this.adapter.db.query(`CALL role_delete('${ctx.params.roleID}')`)
                        await cacher.updateCurrentUserCachedPermissionList(ctx.meta.reqHeaders.token, this.adapter, this.broker);
                        
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Xóa vai trò thành công", {});
                    }

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
        selectAllRoles: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/get-all"
            },
            params: {
                filter: { type: "array" }
            },
            async handler(ctx) {
                return this.adapter.db.query(`CALL role_insert_update_select('','','', 0,'Select')`)
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
                            return resultHandler(1, "Lấy danh sách vai trò thành công", result);
                        } catch (error) {
                            console.log('Filter Fail---------------------------------------')
                            console.log(error)
                            return resultHandler(1, "Lấy danh sách vai trò thành công", result);
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
        assignRoleToUser: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/assign-role-to-user"
            },
            params: {
                userID: { type: "string", min: 3, max: 20 },
                roleID: { type: "string", min: 3, max: 20 }
            },
            async handler(ctx) {

                try {
                    await this.adapter.db.query(`CALL assign_role_to_user('${ctx.params.roleID}','${ctx.params.userID}')`)
                    await cacher.updateCurrentUserCachedPermissionList(ctx.meta.reqHeaders.token, this.adapter, this.broker);

                    this.broker.call("logging.logUserAction", {
                        userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                        action: ctx.meta.endpoint,
                        data: JSON.stringify(ctx.params),
                        comment: ctx.meta.clientIp
                    });
                    return resultHandler(1, "Gán vai trò thành công", {});

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
        removeRoleFromUser: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/remove-role-from-user"
            },
            params: {
                userID: { type: "string", min: 3, max: 20 },
                roleID: { type: "string", min: 3, max: 20 }
            },
            async handler(ctx) {
                try {
                    await this.adapter.db.query(`CALL remove_role_from_user('${ctx.params.roleID}','${ctx.params.userID}')`)
                    await cacher.updateCurrentUserCachedPermissionList(ctx.meta.reqHeaders.token, this.adapter, this.broker);

                    this.broker.call("logging.logUserAction", {
                        userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                        action: ctx.meta.endpoint,
                        data: JSON.stringify(ctx.params),
                        comment: ctx.meta.clientIp
                    });
                    return resultHandler(1, "Loại bỏ vai trò thành công", {});

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
        selectRoleByID: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/get-by-id"
            },
            params: {
                roleID: { type: "string", min: 3, max: 20 }
            },
            async handler(ctx) {
                try {
                    let res = await this.adapter.db.query(`SELECT * FROM Roles WHERE RoleID='${ctx.params.roleID}'`)
                    
                    this.broker.call("logging.logUserAction", {
                        userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                        action: ctx.meta.endpoint,
                        data: JSON.stringify(ctx.params),
                        comment: ctx.meta.clientIp
                    });
                    return resultHandler(1, "Lấy vai trò thành công", res[0]);

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

                try {
                    await this.adapter.db.query(`CALL add_multiple_per_to_role('${ctx.params.permissionID}','${ctx.params.roleID}')`)
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
        assignMultipleRoleToUser: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/assign-multiple-role-to-user"
            },
            params: {
                userID: { type: "string", min: 3, max: 20 },
                roleID: { type: "array" }
            },
            async handler(ctx) {

                try {
                    await this.adapter.db.query(`CALL add_multiple_role_to_user('${ctx.params.roleID}','${ctx.params.userID}')`)
                    await cacher.updateCurrentUserCachedPermissionList(ctx.meta.reqHeaders.token, this.adapter, this.broker);

                    this.broker.call("logging.logUserAction", {
                        userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                        action: ctx.meta.endpoint,
                        data: JSON.stringify(ctx.params),
                        comment: ctx.meta.clientIp
                    });
                    return resultHandler(1, "Gán vai trò thành công", {});

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
