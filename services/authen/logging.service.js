"use strict";
const DbService = require("moleculer-db");
const SqlAdapter = require("moleculer-db-adapter-sequelize");
const { MoleculerError } = require("moleculer").Errors;
const cacher = require('../../domain/authen-utilities/cacher.js')
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
    name: "logging",

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
        
         logUserAction(ctx) {
            //  console.log('Params của log service')
            //  console.log(ctx.params)
            if(process.env.USER_LOG!=null && process.env.USER_LOG==1)
            {
                return this.adapter.db.query(`CALL userlogs_insert_delete_select_update(0, '${ctx.params.userID}', '${ctx.params.action}', '${ctx.params.data}','${ctx.params.comment}', 'Insert')`)
                .then((res) => {
                    return true
                }
                )
                .catch(err => {
                    console.log(err)
                    return false
                });
            }
            return true;
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
