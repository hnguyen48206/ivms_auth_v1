"use strict";
const DbService = require("moleculer-db");
const SqlAdapter = require("moleculer-db-adapter-sequelize");
const { MoleculerError } = require("moleculer").Errors;
const cacher = require('../../domain/authen-utilities/cacher.js')
const resultHandler = require('../../domain/authen-utilities/resulthandler.js');
const tokenManager = require('../../domain/authen-utilities/verifytoken.js');
const filterArray = require('../../domain/authen-utilities/result_filter.js')
const mySQLHost = require('../../domain/authen-utilities/hostRemoveCharacters.js');
const base64Tools = require('../../domain/authen-utilities/base64_tools.js');
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
    name: "camera",

    /**
     * Settings
     */
    settings: {
        use: []
    },

    /**
     * Dependencies
     */
    dependencies: ["authen", "authorize"],

    /**
     * Actions
     */
    actions: {
        createCam: {
            rest: {
                method: "POST",
                path: "/create"
            },
            params: {
                cameraID: { type: "string", min: 3, max: 20 },
                cameraDescription: { type: "string", min: 0, max: 45 },
                major_serverID: { type: "string", min: 0, max: 20 },
                minor_serverID: { type: "string", min: 0, max: 20 },
                camGroupID: {
                    type: "number",
                    integer: true, min: 0,
                    nullable: true
                },
                tag: { type: "string", min: 0, max: 20 },
                sourceCodec: { type: "string", min: 0, max: 20 },
                major_rtsp: { type: "string", min: 0, max: 250 },
                minor_rtsp: {
                    type: "string", min: 0, max: 250
                },
                lat: { type: "string", min: 0, max: 30 },
                long: { type: "string", min: 0, max: 30 }
            },
            async handler(ctx) {
                return this.adapter.db.query(`CALL camera_insert_delete_select_update('${ctx.params.tag}','${ctx.params.sourceCodec}','${ctx.params.major_rtsp}','${ctx.params.minor_rtsp}','${ctx.params.camGroupID}','${ctx.params.cameraID}','${ctx.params.cameraDescription}','${ctx.params.major_serverID}','${ctx.params.minor_serverID}','${ctx.params.minor_serverID}','Update')`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Tạo/Update camera thành công", {});
                    }
                    )
                    .catch(err => {
                        let error = () => {
                            try {
                                console.log('abc', err.parent.sqlMessage)
                                return new MoleculerError('Lỗi hệ thống', 500, 'DB_ERROR', err.parent.sqlMessage);
                            } catch (error) {
                                console.log('Lỗi DB', err);
                                return new MoleculerError('Lỗi hệ thống', 500, 'LG_ERROR')
                            }
                        };
                        return Promise.reject(error());
                    });
            }
        },
        updateCam: {
            rest: {
                method: "POST",
                path: "/update"
            },
            params: {
                cameraID: { type: "string", min: 3, max: 20 },
                cameraDescription: { type: "string", min: 0, max: 45 },
                major_serverID: { type: "string", min: 0, max: 20 },
                minor_serverID: { type: "string", min: 0, max: 20 },
                camGroupID: {
                    type: "number",
                    integer: true, min: 0,
                    nullable: true
                },
                tag: { type: "string", min: 0, max: 20 },
                sourceCodec: { type: "string", min: 0, max: 20 },
                major_rtsp: { type: "string", min: 0, max: 250 },
                minor_rtsp: {
                    type: "string", min: 0, max: 250
                }
            },
            async handler(ctx) {
                return this.adapter.db.query(`CALL camera_insert_delete_select_update('${ctx.params.tag}','${ctx.params.sourceCodec}','${ctx.params.major_rtsp}','${ctx.params.minor_rtsp}','${ctx.params.camGroupID}','${ctx.params.cameraID}','${ctx.params.cameraDescription}','${ctx.params.major_serverID}','${ctx.params.minor_serverID}','Update')`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Tạo/Update camera thành công", {});
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
        deleteCam: {
            rest: {
                method: "POST",
                path: "/delete"
            },
            params: {
                cameraID: { type: "string", min: 3, max: 20 }
            },
            async handler(ctx) {

                return this.adapter.db.query(`CALL camera_insert_delete_select_update('','','','','','','','',0,'${ctx.params.cameraID}','','','','Delete')`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Xóa camera thành công", {});
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
        selectMultipleByOrgID:
        {
            rest: {
                method: "POST",
                path: "/get-multiple-by-orgid"
            },
            params: {
                orgID: { type: "string", min: 3, max: 20 },
                currentPage: { type: "number", min: 0, max: 1000 },
                limit: { type: "number", min: 1, max: 100 },
                isGetAll: { type: "number", min: 0, max: 1 }
            },
            async handler(ctx) {
                let userID = tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID
                let totalPage = 0
                if (ctx.params.isGetAll == 0)
                    totalPage = await this.adapter.db.query(`CALL camera_getTotalPageNum('${userID}', '${ctx.params.orgID}')`);

                return this.adapter.db.query(`CALL camera_select_multiple_by_orgID('${ctx.params.currentPage}', '${ctx.params.limit}', '${ctx.params.isGetAll}','${userID}', '${ctx.params.orgID}')`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });

                        try {
                            for (let x = 0; x < res.length; ++x) {
                                if(res[x].Services!=null)
                                for (let i = 0; i < res[x].Services.length; ++i) {
                                    try {
                                        res[x].Services[i].CameraConfig = base64Tools.decode(res[x].Services[i].CameraConfig);
                                    } catch (error) {
                                        console.log(error)
                                    }
                                }
                            }
                        } catch (error) {
                            
                        }                      

                        if (ctx.params.isGetAll == 1)
                            return resultHandler(1, "Select thành công", res);
                        else (ctx.params.isGetAll == 0)
                        {
                            let totalPageNum = Math.round(totalPage.length / ctx.params.limit);
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
        selectMultipleByOrgID_TreeGrid:
        {
            rest: {
                method: "POST",
                path: "/get-multiple-by-orgid-treegrid"
            },
            params: {
                orgID: { type: "string", min: 3, max: 20 },
                currentPage: { type: "number", min: 0, max: 1000 },
                limit: { type: "number", min: 1, max: 100 },
                isGetAll: { type: "number", min: 0, max: 1 }
            },
            async handler(ctx) {
                let userID = tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID
                let totalPage = 0
                if (ctx.params.isGetAll == 0)
                    totalPage = await this.adapter.db.query(`CALL camera_getTotalPageNum('${userID}', '${ctx.params.orgID}')`);

                return this.adapter.db.query(`CALL camera_select_multiple_by_orgID('${ctx.params.currentPage}', '${ctx.params.limit}', '${ctx.params.isGetAll}','${userID}', '${ctx.params.orgID}')`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });

                        try {
                            for (let x = 0; x < res.length; ++x) {
                                if(res[x].Services!=null)
                                for (let i = 0; i < res[x].Services.length; ++i) {
                                    try {
                                        res[x].Services[i].CameraConfig = base64Tools.decode(res[x].Services[i].CameraConfig); 
                                    } catch (error) {
                                        console.log(error)
                                    }
                                }
                            }

                        } catch (error) {

                        }

                        if (ctx.params.isGetAll == 1)
                            return resultHandler(1, "Select thành công", this.reformatCamData(res));
                        else (ctx.params.isGetAll == 0)
                        {
                            let totalPageNum = Math.round(totalPage.length / ctx.params.limit);
                            if (totalPage.length > 0 && totalPageNum == 0)
                                totalPageNum = 1;
                            return resultHandler(1, "Select thành công", {
                                totalPage: totalPageNum,
                                data: this.reformatCamData(res)
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
        getMultipleCamHasNotBeenAssignedPermissions: {
            rest: {
                method: "POST",
                path: "/get-not-yet-assigned-permission"
            },
            params: {
                filter: { type: "array" }
            },
            async handler(ctx) {

                return this.adapter.db.query(`CALL get_multiple_cam_has_not_been_assigned_permissions()`)
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
                            return resultHandler(1, "Lấy danh sách camera thành công", result);
                        } catch (error) {
                            console.log('Filter Fail---------------------------------------')
                            console.log(error)
                            return resultHandler(1, "Lấy danh sách camera thành công", result);
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
        getMultipleCamHasAssignedPermissions: {
            rest: {
                method: "POST",
                path: "/get-already-assigned-permission"
            },
            params: {
                filter: { type: "array" }
            },
            async handler(ctx) {
                // ctx.meta["cameraIDList"]=['abc','xyz']
                // await this.broker.call("authorize.authorizeCamUsage", ctx);

                return this.adapter.db.query(`CALL get_multiple_cam_has_already_been_assigned_permissions()`)
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
                            return resultHandler(1, "Lấy danh sách camera thành công", result);
                        } catch (error) {
                            console.log('Filter Fail---------------------------------------')
                            console.log(error)
                            return resultHandler(1, "Lấy danh sách camera thành công", result);
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
        createCamWithOrgAndServAndAutoAssignToUser: {
            rest: {
                method: "POST",
                path: "/create-update-with-org-serv"
            },
            params: {
                cameraID: { type: "string", min: 3, max: 20 },
                cameraDescription: { type: "string", min: 0, max: 45 },
                orgID: { type: "array" },
                serviceID: { type: "array" },
                major_serverID: { type: "string", min: 0, max: 20 },
                minor_serverID: { type: "string", min: 0, max: 20 },
                camGroupID: {
                    type: "number",
                    integer: true, min: 0,
                    nullable: true
                },
                tag: { type: "string", min: 0, max: 20 },
                sourceCodec: { type: "string", min: 0, max: 20 },
                major_rtsp: { type: "string", min: 0, max: 250 },
                minor_rtsp: {
                    type: "string", min: 0, max: 250
                },
                cameraConfigs: { type: "array" },
                lat: { type: "string", min: 0, max: 50 },
                long: { type: "string", min: 0, max: 50 },
                address: { type: "string", min: 0, max: 200 },
                camBrand: { type: "string", min: 0, max: 50 }
            },
            async handler(ctx) {
                try {
                    if (ctx.params.cameraConfigs.length != ctx.params.serviceID.length)
                        return resultHandler(0, "Số lượng service và config của camera phải tương ứng.", {});
                    else {
                        let userID = tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID

                        let checkIfNumberOfCamsHasNotExceeded = await this.adapter.db.query(`CALL check_if_number_of_cam_has_not_exceeded('${ctx.params.cameraID}','${parseInt(process.env.CAM_LIMIT.toString())}')`)
                        console.log(checkIfNumberOfCamsHasNotExceeded[0].result)
                        //Convert tất cả config về base64
                        for (let i = 0; i < ctx.params.cameraConfigs.length; ++i) {
                            ctx.params.cameraConfigs[i] = base64Tools.encode(ctx.params.cameraConfigs[i]);
                        }
                        if (checkIfNumberOfCamsHasNotExceeded[0].result == 1) {
                            let type
                            if (ctx.params.serviceID.length > 0 && ctx.params.orgID.length > 0)
                                type = '0';
                            if (ctx.params.orgID.length > 0)
                                type = '2';
                            if (ctx.params.serviceID.length > 0)
                                type = '1';

                            await this.adapter.db.query(`CALL camera_create_update_with_org_serv('${type}','${ctx.params.tag}','${ctx.params.sourceCodec}','${ctx.params.major_rtsp}','${ctx.params.minor_rtsp}','${ctx.params.camGroupID}','${ctx.params.cameraID}','${ctx.params.cameraDescription}','${ctx.params.major_serverID}','${ctx.params.minor_serverID}','Update', '${ctx.params.orgID.toString()}', '${ctx.params.serviceID.toString()}', '${ctx.params.cameraConfigs.toString()}', '${ctx.params.lat}', '${ctx.params.long}', '${ctx.params.address}' ,'${userID}', '${ctx.params.camBrand}' )`)
                            await this.saveServerListToCache();
                            // Thêm cho role deault của user không phải super_admin
                            // await this.adapter.db.query(`CALL add_multiple_camserv_to_roleper('${ctx.params.serviceID.toString()}','${ctx.params.cameraID}', 'use_all_cam_serv', 'super_admin')`);
                            await cacher.updateCurrentUserCachedPermissionList(ctx.meta.reqHeaders.token, this.adapter, this.broker);
                            this.broker.call("logging.logUserAction", {
                                userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                                action: ctx.meta.endpoint,
                                data: JSON.stringify(ctx.params),
                                comment: ctx.meta.clientIp
                            });
                            return resultHandler(1, "Tạo camera với org và service thành công", {});
                        }
                        else {
                            return resultHandler(0, "Số lượng camera trong hệ thống đã vượt mức cho phép. Vui lòng liên hệ Quản trị viên.", {});
                        }
                    }

                }
                catch (err) {
                    let error = () => {
                        try {
                            console.log('abc', err.parent.sqlMessage)
                            return new MoleculerError('Lỗi hệ thống', 500, 'DB_ERROR', err.parent.sqlMessage);
                        } catch (error) {
                            console.log('Lỗi DB', err);
                            return new MoleculerError('Lỗi hệ thống', 500, 'LG_ERROR')
                        }
                    };
                    return Promise.reject(error());
                }
            }
        },
        checkIfCamExist: {
            rest: {
                method: "POST",
                path: "/check-cam-exist"
            },
            params: {
                cameraID: { type: "string", min: 3, max: 20 }
            },
            async handler(ctx) {
                return this.adapter.db.query(`CALL check_cam_existence('${ctx.params.cameraID}')`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        if (res.length > 0)
                            return resultHandler(1, "Camera tồn tại", res[0]);
                        else
                            return resultHandler(0, "Camera không tồn tại", {});
                    }
                    )
                    .catch(err => {
                        console.log(err);
                        let error = () => {
                            try {
                                console.log('abc', err.parent.sqlMessage)
                                return new MoleculerError('Lỗi hệ thống', 500, 'DB_ERROR', err.parent.sqlMessage);
                            } catch (error) {
                                return new MoleculerError('Lỗi hệ thống', 500, 'LG_ERROR')
                            }
                        };
                        return Promise.reject(error());
                    });

            }
        },
        getByID:
        {
            rest: {
                method: "POST",
                path: "/get-by-id"
            },
            params: {
                cameraID: { type: "string", min: 3, max: 20 }
            },
            async handler(ctx) {

                try {
                    let userID = tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID

                    let res = await this.adapter.db.query(`CALL camera_select_by_id('${ctx.params.cameraID}', '${userID}')`)

                    try {
                        for (let x = 0; x < res.length; ++x) {
                            if(res[x].Services!=null)
                            for (let i = 0; i < res[x].Services.length; ++i) {
                                try {
                                    res[x].Services[i].CameraConfig = base64Tools.decode(res[x].Services[i].CameraConfig);
                                } catch (error) {
                                    console.log(error)
                                }
                            }
                        }

                    } catch (error) {

                    }


                    this.broker.call("logging.logUserAction", {
                        userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                        action: ctx.meta.endpoint,
                        data: JSON.stringify(ctx.params),
                        comment: ctx.meta.clientIp
                    });

                    if (res != null)
                        return resultHandler(1, "Lấy thông tin camera thành công", res);
                    else
                        return resultHandler(0, "Camera không thuộc khu vực quản lý của bạn", {});

                } catch (err) {
                    let error = () => {
                        try {
                            console.log('abc', err.parent.sqlMessage)
                            return new MoleculerError('Lỗi hệ thống', 500, 'DB_ERROR', err.parent.sqlMessage);
                        } catch (error) {
                            console.log('Lỗi DB', err);
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

        reformatCamData(array) {
            let returnArray = []
            for (let i = 0; i < array.length; ++i) {
                let tempObject =
                {
                    data: null,
                    children: []
                }
                let orgList = []
                if (array[i].OrganizationID != null)
                    orgList = array[i].OrganizationID.split(',');

                let servList = []

                if (array[i].Services != null)
                    servList = array[i].Services;

                tempObject.data = array[i];


                // console.log(orgList)
                // console.log(servList)

                if (orgList.length > 0)
                    tempObject.data.OrganizationID = orgList[0]
                else
                    tempObject.data.OrganizationID = '';

                if (servList.length > 0)
                    tempObject.data.ServiceID = servList[0].ServiceID
                else
                    tempObject.data.ServiceID = '';

                if (orgList.length > 0 || servList.length > 0) {
                    if (orgList.length >= servList.length) {
                        for (let j = 1; j < orgList.length; ++j) {
                            let data = {
                                data: {
                                    "ParentCam": "",
                                    "CameraID": "",
                                    "CameraDescription": "",
                                    "CreatedOn": "",
                                    "ModifiedOn": "",
                                    "ServiceID": "",
                                    "OrganizationID": "",
                                    "ServerID": "",
                                    "CamGroup": "",
                                    "Tag": "",
                                    "SourceCodec": "",
                                    "RTSP": "",
                                    "cLat":"",
                                    "cLong":"",
                                    "Address":"",
                                    "cBrand":""
                                }
                            }
                            data.data.OrganizationID = orgList[j]
                            data.data.ServiceID = servList[j].ServiceID || ''

                            tempObject.children.push(data);
                        }
                    }
                    else {
                        for (let j = 1; j < servList.length; ++j) {
                            let data = {
                                data: {
                                    "ParentCam": "",
                                    "CameraID": "",
                                    "CameraDescription": "",
                                    "CreatedOn": "",
                                    "ModifiedOn": "",
                                    "ServiceID": "",
                                    "OrganizationID": "",
                                    "ServerID": "",
                                    "CamGroup": "",
                                    "Tag": "",
                                    "SourceCodec": "",
                                    "RTSP": "",
                                    "cLat":"",
                                    "cLong":"",
                                    "Address":"",
                                    "cBrand":""
                                }
                            }
                            data.data.ServiceID = servList[j].ServiceID || ''
                            data.data.OrganizationID = orgList[j] || ''

                            tempObject.children.push(data);
                        }
                    }

                }

                returnArray.push(tempObject);

            }
            return returnArray;
        },

        async saveServerListToCache() {
            try {
                let res = await this.adapter.db.query(`CALL server_insert_delete_select_update('','','','','','','', '','','','','','Select')`);
                console.log('Get server list ok')
                await cacher.set(this.adapter, this.broker, 'serverList', res);
            } catch (error) {
                console.log(error)
            }
            return true
        },

        generateRandomString(length) {
            var letters = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
            var IDtext = "";
            var i = 0;
            while (i < length) {
                var letterIndex = Math.floor(Math.random() * letters.length);
                var letter = letters[letterIndex];
                IDtext = IDtext + letter;
                i++;
            }
            return IDtext
        }
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
