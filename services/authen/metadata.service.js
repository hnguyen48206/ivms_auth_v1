"use strict";
const DbService = require("moleculer-db");
const SqlAdapter = require("moleculer-db-adapter-sequelize");
const { MoleculerError } = require("moleculer").Errors;
const tokenManager = require('../../domain/authen-utilities/verifytoken.js');
const resultHandler = require('../../domain/authen-utilities/resulthandler.js');
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
    name: "meta",

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

        createMeta: {
            rest: {
                method: "POST",
                path: "/create"
            },
            params: {
                metaID: { type: "string", min: 3, max: 200 },
                metaValue: { type: "string" }
            },
            async handler(ctx) {

                return this.adapter.db.query(`CALL metadata_insert_delete_select_update('${ctx.params.metaID}','${base64Tools.encode(ctx.params.metaValue)}','Insert')`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Tạo/Cập nhật metadata thành công", {});
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
        removeMeta: {
            rest: {
                method: "POST",
                path: "/remove"
            },
            params: {
                metaID: { type: "string", min: 3, max: 200 },
            },
            async handler(ctx) {
                return this.adapter.db.query(`CALL metadata_insert_delete_select_update('${ctx.params.metaID}','','Delete')`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Xóa metadata thành công", {});
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
        selectMeta:
        {
            rest: {
                method: "GET",
                path: "/get"
            },
            async handler(ctx) {
                return this.adapter.db.query(`CALL metadata_insert_delete_select_update('','','Select')`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });

                        if (res.length > 0) {
                            for (let i = 0; i < res.length; ++i) {
                                res[i].Value = base64Tools.decode(res[i].Value);
                            }
                        }
                        return resultHandler(1, "Lấy danh sách metadata thành công", res);
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
        selectMetaByID:
        {
            rest: {
                method: "POST",
                path: "/get-by-id"
            },
            params: {
                metaID: { type: "string", min: 3, max: 200 },
            },
            async handler(ctx) {
                return this.adapter.db.query(`select * from Metadata where MetadataKey = "${ctx.params.metaID}"`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });

                        try {
                            if (res.length > 0) {
                                res = res[0][0].Value = base64Tools.decode(res[0][0].Value);
                            }
                            return resultHandler(1, "Lấy metadata thành công", res);

                        } catch (error) {
                            return resultHandler(1, "Không tìm thấy key này", {});
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
