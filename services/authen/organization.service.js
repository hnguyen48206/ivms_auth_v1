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
    name: "organization",
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
        createOrg: {
            rest: {
                method: "POST",
                path: "/create"
            },
            params: {
                orgID: { type: "string", min: 3, max: 20 },
                parentCode: { type: "string", min: 3, max: 20 },
                orgDescription: { type: "string", min: 0, max: 45 },
                address: { type: "string", min: 0, max: 200 },
                lat: { type: "string", min: 0, max: 20 },
                long: { type: "string", min: 0, max: 20 },
            },
            async handler(ctx) {
                let createdBy = tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID

                return this.adapter.db.query(`CALL create_org('${ctx.params.address}','${ctx.params.lat}','${ctx.params.long}','${createdBy}','${ctx.params.orgID}','${ctx.params.parentCode}', '${ctx.params.orgDescription}')`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Tạo org thành công", {});
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
        updateOrg: {
            rest: {
                method: "POST",
                path: "/update"
            },
            params: {
                orgID: { type: "string", min: 3, max: 20 },
                parentCode: { type: "string", min: 3, max: 20 },
                orgDescription: { type: "string", min: 0, max: 45 },
                address: { type: "string", min: 0, max: 200 },
                lat: { type: "string", min: 0, max: 20 },
                long: { type: "string", min: 0, max: 20 },
                status: { type: "string", min: 0, max: 15 }
            },
            async handler(ctx) {
                return this.adapter.db.query(`CALL update_org('${ctx.params.address}','${ctx.params.lat}','${ctx.params.long}','${ctx.params.status}','${ctx.params.orgID}','${ctx.params.parentCode}', '${ctx.params.orgDescription}')`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Update org thành công", {});
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
        deleteOrg: {
            rest: {
                method: "POST",
                path: "/delete"
            },
            params: {
                orgID: { type: "string", min: 3, max: 20 }
            },
            async handler(ctx) {
                //kiểm tra xem org có org con hay ko
                let listOfOrg = await this.adapter.db.query(`CALL check_if_org_has_dependencies('${ctx.params.orgID}')`);
                if(listOfOrg[0].relations!=null)
                return resultHandler(0, "Xóa org không thành công do org đang chứa các org phụ thuộc", {});
                else
                {
                    //kiểm tra xem org có gán vào server hay có chứa cam nào hay ko
                    let check = await this.adapter.db.query(`CALL check_if_org_has_cam_and_server('${ctx.params.orgID}')`);
                    if(check.length>0)
                    return resultHandler(0, "Xóa org không thành công do org đang quản lý ít nhất 1 server hoặc camera", {});
                    else
                    return this.adapter.db.query(`CALL delete_org('${ctx.params.orgID}')`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Delete org thành công", {});
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
        selectByID:
        {
            rest: {
                method: "POST",
                path: "/get-by-id"
            },
            params: {
                orgID: { type: "string", min: 3, max: 20 }
            },
            async handler(ctx) {

                return this.adapter.db.query(`CALL org_select_by_id('${ctx.params.orgID}')`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Select thành công", { res });
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
        selectMultiple:
        {
            rest: {
                method: "POST",
                path: "/get-multiple"
            },
            params: {
                currentPage: { type: "number", min: 0, max: 1000 },
                limit: { type: "number", min: 1, max: 100 },
                isGetAll: { type: "number", min: 0, max: 1 }
            },
            async handler(ctx) {
                //select with the check of dependency child of root org
                let userID = tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID

                let child_array =  await this.adapter.db.query(`CALL find_all_child_of_parent_org('${userID}')`);
                // console.log(child_array[0].relations);

                let totalPage = 0
                if (ctx.params.isGetAll == 0)
                    totalPage = await this.adapter.db.query(`CALL org_getTotalPageNum('${userID}','${child_array[0].relations}')`);
                
                return this.adapter.db.query(`CALL org_select_multiple('${ctx.params.currentPage}', '${ctx.params.limit}', '${ctx.params.isGetAll}','${userID}','${child_array[0].relations}')`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });


                        if (ctx.params.isGetAll == 1)
                            return resultHandler(1, "Select thành công", res);
                        else (ctx.params.isGetAll == 0)
                        {
                            let totalPageNum = Math.round(totalPage.length / ctx.params.limit);
                            // console.log(totalPage, totalPageNum)

                            if (totalPage.length > 0 && totalPageNum == 0)
                                totalPageNum = 1;
                            return resultHandler(1, "Select thành công", {
                                totalPage: totalPageNum,
                                data: res
                            });
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
        selectMultipleOrgWithoutCheck:
        {
            rest: {
                method: "GET",
                path: "/get-all"
            },
            async handler(ctx) {

                return this.adapter.db.query(`SELECT * FROM Organization`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        
                        //Bị return duplicate
                        return resultHandler(1, "Select thành công", res[0]);
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
