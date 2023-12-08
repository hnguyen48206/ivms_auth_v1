"use strict";
const DbService = require("moleculer-db");
const SqlAdapter = require("moleculer-db-adapter-sequelize");
const Sequelize = require("sequelize");
const { MoleculerError } = require("moleculer").Errors;
const resultHandler = require('../../domain/authen-utilities/resulthandler.js')
const cacher = require('../../domain/authen-utilities/cacher.js')
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
        name: "Permissions",
        define: {
            PermissionID: Sequelize.STRING,
            PermissionDescription: Sequelize.STRING,
            API: Sequelize.STRING,
            CreatedOn: Sequelize.DATE,
            ModifiedOn: Sequelize.DATE,
        },
        options: {
            // Options from http://docs.sequelizejs.com/manual/tutorial/models-definition.html
        }
    },
    name: "permission",

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
        createPermission: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/create"
            },
            params: {
                permissionID: { type: "string", min: 3, max: 20 },
                permissionDescription: { type: "string", min: 0, max: 45 },
                api: { type: "string", min: 3, max: 50 },
                assetType: { type: "string", min: 3, max: 45 },
            },
            async handler(ctx) {
                try {
                    await this.adapter.db.query(`CALL permission_insert_update_select('${ctx.params.permissionID}','${ctx.params.permissionDescription}', '${ctx.params.api}','${ctx.params.assetType}','Insert')`)
                    //Tự động gán quyền mới tạo cho super admin

                    await this.auto_assign_every_newly_created_permission_to_superadmin('super_admin', ctx.params.permissionID);
                    await cacher.updateCurrentUserCachedPermissionList(ctx.meta.reqHeaders.token, this.adapter, this.broker);

                    this.broker.call("logging.logUserAction", {
                        userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                        action: ctx.meta.endpoint,
                        data: JSON.stringify(ctx.params),
                        comment: ctx.meta.clientIp
                    });
                    return resultHandler(1, "Tạo quyền thành công", {});

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
        updatePermission: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/update"
            },
            params: {
                permissionID: { type: "string", min: 3, max: 20 },
                permissionDescription: { type: "string", min: 0, max: 45 },
                api: { type: "string", min: 3, max: 50 },
                assetType: { type: "string", min: 3, max: 45 }
            },
            async handler(ctx) {

                return this.adapter.db.query(`CALL permission_insert_update_select('${ctx.params.permissionID}','${ctx.params.permissionDescription}', '${ctx.params.api}','${ctx.params.assetType}','Update')`)
                    .then((res) => {

                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });

                        return resultHandler(1, "Update quyền thành công", {});
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
        deletePermission: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/delete"
            },
            params: {
                permissionID: { type: "string", min: 3, max: 20 }
            },
            async handler(ctx) {
                try {
                    await this.adapter.db.query(`CALL permission_delete('${ctx.params.permissionID}')`);
                    await cacher.updateCurrentUserCachedPermissionList(ctx.meta.reqHeaders.token, this.adapter, this.broker);

                    this.broker.call("logging.logUserAction", {
                        userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                        action: ctx.meta.endpoint,
                        data: JSON.stringify(ctx.params),
                        comment: ctx.meta.clientIp
                    });
                    return resultHandler(1, "Xóa quyền thành công", {});

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
        selectAllPermissionsTest: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/get-all"
            },
            params: {
                filter: { type: "array" }
            },
            async handler(ctx) {
                return this.adapter.db.query(`CALL permission_insert_update_select('','', '','','Select')`)
                    .then((res) => {
                        let result = res;
                        try {
                            if (ctx.params.filter.length > 0) {
                                result = filterArray.filterArray(result, ctx.params.filter)
                            }

                            this.broker.call("logging.logUserAction", {
                                userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                                action: ctx.meta.endpoint,
                                data: JSON.stringify(ctx.params),
                                comment: ctx.meta.clientIp
                            });
                            return resultHandler(1, "Lấy danh sách quyền thành công", result);
                        } catch (error) {
                            console.log('Filter Fail---------------------------------------')
                            console.log(error)
                            return resultHandler(1, "Lấy danh sách quyền thành công", result);
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
        selectPermissionsByID: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/get-by-id"
            },
            params: {
                permissionID: { type: "string", min: 3, max: 20 }
            },
            async handler(ctx) {
                return this.adapter.db.query(`SELECT * FROM Permissions WHERE PermissionID='${ctx.params.permissionID}'`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });

                        if (res[0].length > 0)
                            return resultHandler(1, "Lấy quyền thành công", res[0]);
                        else
                            return resultHandler(0, "Không tìm thấy dữ liệu", {});
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
        async auto_assign_every_newly_created_permission_to_superadmin(roleID, permissionID) {

            this.adapter.db.query(`CALL autoupdate_userrolepermission_new_permission_added('${roleID}','${permissionID}')`)
                .then((res) => {
                    console.log("Gán quyền cho superadmin thành công ", res)
                }
                )
                .catch(err => {
                    console.log("Gán quyền cho superadmin thất bại ", err);
                });
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
