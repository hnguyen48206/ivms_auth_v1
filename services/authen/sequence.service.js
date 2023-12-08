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
    name: "sequence",

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

        createUpdateSequence: {
            rest: {
                method: "POST",
                path: "/create-update"
            },
            params: {
                sequenceID: { type: "string", min: 5, max: 100 },
                sequenceName: { type: "string", min: 5, max: 100 },
                presets: { type: "string" },
                note: { type: "string"},
                time: { type: "number", min: 1, max: 100},
                favoriteList: { type: "array" },
              },
            async handler(ctx) {

                let userID = tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID;
                return this.adapter.db.query(`CALL sequence_insert_delete_select_update(
                    '${ctx.params.sequenceID}',
                    '${ctx.params.sequenceName}',
                    '${base64Tools.encode(ctx.params.presets)}',
                    '${base64Tools.encode(ctx.params.note)}',
                    '${ctx.params.time}',
                    '${userID}',
                    '${ctx.params.favoriteList.toString()}',
                    'Insert')`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Tạo/Cập nhật sequence thành công", {});
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
        removeSequence: {
            rest: {
                method: "POST",
                path: "/remove"
            },
            params: {
                sequenceID: { type: "string", min: 5, max: 100 }
            },
            async handler(ctx) {
                let userID = tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID;
                return this.adapter.db.query(`CALL sequence_insert_delete_select_update(
                    '${ctx.params.sequenceID}',
                    '',
                    '',
                    '',
                    '1',
                    '',
                    '',
                    'Delete')`)
                        .then((res) => {
                            this.broker.call("logging.logUserAction", {
                                userID: userID,
                                action: ctx.meta.endpoint,
                                data: JSON.stringify(ctx.params),
                                comment: ctx.meta.clientIp
                            });
                            return resultHandler(1, "Xóa sequence thành công", {});
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
        selectSequenceAll:
        {
            rest: {
                method: "GET",
                path: "/get-by-user"
            },
            async handler(ctx) {
                let userID = tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID;
                return this.adapter.db.query(`CALL sequence_insert_delete_select_update(
                    '',
                    '',
                    '',
                    '',
                    '1',
                    '${userID}',
                    '',
                    'Select')`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });

                        if (res.length > 0) {
                            for (let i = 0; i < res.length; ++i) {
                                res[i].Presets = Buffer.from(res[i].Presets, 'base64').toString('ascii');
                                res[i].Note = Buffer.from(res[i].Note, 'base64').toString('ascii')
                            }
                        }
                        return resultHandler(1, "Lấy danh sách sequence thành công", res);
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
