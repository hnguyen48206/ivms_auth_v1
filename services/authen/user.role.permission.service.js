"use strict";
const DbService = require("moleculer-db");
const SqlAdapter = require("moleculer-db-adapter-sequelize");
const cacher = require('../../domain/authen-utilities/cacher.js')
const { MoleculerError } = require("moleculer").Errors;
const resultHandler = require('../../domain/authen-utilities/resulthandler.js')
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
    name: "user-role-permission",

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
        assignRolePermissionToUser: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/assign-role-permission-to-user"
            },
            params: {
                userID: { type: "string", min: 3, max: 20 },
                roleID: { type: "string", min: 3, max: 20 },
                permissionID: { type: "string", min: 3, max: 20 }
            },
            async handler(ctx) {
                try {
                    await this.adapter.db.query(`CALL user_role_permission_insert_delete_select('${ctx.params.roleID}','${ctx.params.permissionID}','${ctx.params.userID}','Insert')`)
                    await cacher.updateCurrentUserCachedPermissionList(ctx.meta.reqHeaders.token, this.adapter, this.broker);

                    this.broker.call("logging.logUserAction", {
                        userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                        action: ctx.meta.endpoint,
                        data: JSON.stringify(ctx.params),
                        comment: ctx.meta.clientIp
                    });
                        return resultHandler(1, "Gán quyền và vai trò cho user thành công", {});

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
