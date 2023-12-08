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
    name: "favorite",

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

        createUpdateFavorite: {
            rest: {
                method: "POST",
                path: "/create-update"
            },
            params: {
                favoriteID: { type: "string", min: 5, max: 100 },
                favoriteName: { type: "string", min: 5, max: 100 },
                dashboard: { type: "string" },
                playerConfig: { type: "string"},
                maxCols: { type: "number", min: 1, max: 20},
                maxRows: { type: "number", min: 1, max: 20 },
                status: { type: "number", min: 0, max: 1 },
              },
            async handler(ctx) {

                let userID = tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID;
                return this.adapter.db.query(`CALL favorite_insert_delete_select_update(
                    '${ctx.params.favoriteID}',
                    '${ctx.params.favoriteName}',
                    '${base64Tools.encode(ctx.params.dashboard)}',
                    '${base64Tools.encode(ctx.params.playerConfig)}',
                    '${ctx.params.maxCols}',
                    '${ctx.params.maxRows}',
                    '${ctx.params.status}',
                    '${userID}',
                    'Insert')`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Tạo/Cập nhật favorite thành công", {});
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
        removeFavorite: {
            rest: {
                method: "POST",
                path: "/remove"
            },
            params: {
                favoriteID: { type: "string", min: 5, max: 100 }
            },
            async handler(ctx) {
                let userID = tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID;
                return this.adapter.db.query(`CALL favorite_insert_delete_select_update(
                        '${ctx.params.favoriteID}',
                        '',
                        '',
                        '',
                        '1',
                        '1',
                        '1',
                        '${userID}',
                        'Delete_fav')`)
                        .then((res) => {
                            this.broker.call("logging.logUserAction", {
                                userID: userID,
                                action: ctx.meta.endpoint,
                                data: JSON.stringify(ctx.params),
                                comment: ctx.meta.clientIp
                            });
                            return resultHandler(1, "Xóa favorite thành công", {});
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
        selectFavoriteAll:
        {
            rest: {
                method: "GET",
                path: "/get-by-user"
            },
            async handler(ctx) {
                let userID = tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID;
                return this.adapter.db.query(`CALL favorite_insert_delete_select_update(
                    '',
                    '',
                    '',
                    '',
                    '1',
                    '1',
                    '1',
                    '${userID}',
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
                                res[i].Dashboard = Buffer.from(res[i].Dashboard, 'base64').toString('ascii');
                                res[i].PlayerConfig = Buffer.from(res[i].PlayerConfig, 'base64').toString('ascii')
                            }
                        }
                        return resultHandler(1, "Lấy danh sách favorite thành công", res);
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
