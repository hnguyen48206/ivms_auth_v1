"use strict";
const DbService = require("moleculer-db");
const SqlAdapter = require("moleculer-db-adapter-sequelize");
const { MoleculerError } = require("moleculer").Errors;
const cacher = require('../../domain/authen-utilities/cacher.js')
const resultHandler = require('../../domain/authen-utilities/resulthandler.js');
const tokenManager = require('../../domain/authen-utilities/verifytoken.js');
var sha256 = require('js-sha256');
"use strict";
const mySQLHost = require('../../domain/authen-utilities/hostRemoveCharacters.js');
const filterArray = require('../../domain/authen-utilities/result_filter.js')
var moment = require('moment');
const dtp_otp = require('../../domain/authen-utilities/DTP_OTP.js');
const vnpt_otp = require('../../domain/authen-utilities/VNPT_OTP.js');
const tris_api = require('../../domain/authen-utilities/tris_user.js');
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
    name: "user",

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
        createUser: {
            //Hiện ko còn sử dụng
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/create"
            },
            params: {
                username: { type: "string", min: 3, max: 20 },
                name: { type: "string", min: 0, max: 45 },
                phonenumber: { type: "string", min: 0, max: 15 },
                email: { type: "string", min: 0, max: 100 },
                orgid: { type: "string", min: 3, max: 20 },
                birthday: { type: "string", min: 0, max: 10 },
                userdata: { type: "string" }
            },
            async handler(ctx) {
                let createdBy = tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID
                let randomPassword = this.generatePassword(11, true, true, true);

                // let testUserData = {"currentDashboardMode":1,"camerasPerPage":9,"changePageTimeout":30,"selectedPreset":0,"savedPresets":[{"id":1,"selected":false,"name":"Preset 01","data":[{"y":0,"x":0,"data":{"enabledPtz":1,"ptzConfig":"{\"address\":\"192.168.0.65:554\",\"user\":\"test\",\"pass\":\"123\"}","cameraId":"SanhG","group_id":"root","userdata":"123","name":"SanhG","tag":"","active":false,"output":{"hls":{"enable":1,"config":{"codec":"copy"},"status":1,"link":"http://10.70.39.46:80/streams/61b086699fe49c001273e2c7/stream/61b086699fe49c001273e2c7.m3u8","name":"hls","status_name":"running","status_color":"bg-success"},"file":{"enable":1,"config":{"interval":300,"type":"mp4"},"status":1,"name":"file","status_name":"running","status_color":"bg-success"},"rtsp":{"enable":1,"config":{"restream_type":"RTSP_COPY_ORIGINAL"},"status":2,"link":"rtsp://10.70.39.32:8554/618f899918bef2001250c9e3","name":"rtsp","status_name":"stopped","status_color":"bg-dark"},"ws":{"enable":1,"status":"1","link":"ws://10.70.39.46:8100/61b0fae8a7fee10013d351f5","name":"ws","status_name":"running","status_color":"bg-success"}},"cameraDescription":"Camera Thang May G","serverId":"10.70.39.32","groupId":9,"createdOn":"13/11/2021","modifiedOn":"13/11/2021","serviceIds":["hls","rtsp"],"organizationIds":["superOrg"],"coreCreatedOn":1636796825398,"input":{"rtsp":"rtsp://user:C3niRqLvS6zQecN@192.168.0.65:554","type":"H264"},"orgId":"superOrg","mode":"hls,file,rtsp,ws"}}],"options":{"maxCols":3,"fixedRowHeight":270}},{"id":2,"selected":false,"name":"Preset 02","data":[],"options":{"maxCols":4,"fixedRowHeight":200}},{"id":3,"selected":false,"name":"Preset 03","data":[],"options":{"maxCols":3,"fixedRowHeight":150}},{"id":4,"selected":false,"name":"Preset 04","data":[],"options":{"maxCols":4,"fixedRowHeight":100}},{"id":5,"selected":false,"name":"Preset 05","data":[],"options":{"maxCols":5,"fixedRowHeight":70}}]}
                let encodedUserData
                if (ctx.params.userdata != '') {
                    try {
                        encodedUserData = tokenManager.createToken(JSON.parse(ctx.params.userdata))
                    } catch (error) {
                        return new MoleculerError('Lỗi hệ thống', 500, 'LG_ERROR', error);
                    }
                }
                else
                    encodedUserData = tokenManager.createToken(JSON.parse('{}'));

                try {
                    vnpt_otp.sendEmail(ctx.params.email, 'Thông tin mật khẩu từ hệ thống IVMS', 'Mật khẩu mới của bạn là: ' + randomPassword)
                } catch (error) {

                }
                await this.adapter.db.query(`SET NAMES "utf8mb4"`);
                return this.adapter.db.query(`CALL create_user('${encodedUserData}','${createdBy}','${ctx.params.birthday}','${ctx.params.username}','${ctx.params.name}', '${ctx.params.phonenumber}', '${ctx.params.email}', '${sha256(randomPassword)}','${ctx.params.orgid}')`)
                    .then((res) => {

                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });

                        return resultHandler(1, "Tạo user thành công", {});
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
        createUpdateUserWithRoles: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/create-update-with-roles"
            },
            params: {
                username: { type: "string", min: 3, max: 20 },
                name: { type: "string", min: 0, max: 45 },
                phonenumber: { type: "string", min: 0, max: 15 },
                email: { type: "string", min: 0, max: 100 },
                orgid: { type: "string", min: 3, max: 20 },
                roleID: { type: "array" },
                birthday: { type: "string", min: 0, max: 10 },
                userdata: { type: "string" },
                status: { type: "string", min: 2, max: 4 }
            },
            async handler(ctx) {
                let createdBy = tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID;
                let randomPassword = this.generatePassword(11, true, true, true);
                try {
                    vnpt_otp.sendEmail(ctx.params.email, 'Thông tin mật khẩu từ hệ thống IVMS', 'Mật khẩu mới của bạn là: ' + randomPassword)
                } catch (error) {
                }
                if (ctx.params.status != 'mở' && ctx.params.status != 'đóng')
                    return resultHandler(0, "Giá trị trạng thái chỉ chấp nhận mở hoặc đóng", {});
                let encodedUserData
                let originalUserData
                if (ctx.params.userdata != '')
                    originalUserData = JSON.parse(ctx.params.userdata);
                else
                    originalUserData = JSON.parse('{}');
                //Nếu triển khai DTP thì tạo acc bên TRIS.
                if (process.env.DTP.toString() == '1') {
                    let tris = await tris_api.createUser(ctx.params.username, randomPassword, ctx.params.email);
                    if (tris.isOK)
                        originalUserData['tris_userID'] = tris.data;
                }
                try {
                    console.log('orifinalUSERDATA ', originalUserData )
                    encodedUserData = tokenManager.createToken(originalUserData)
                } catch (error) {
                    console.log(error)
                    return new MoleculerError('Lỗi hệ thống', 500, 'LG_ERROR', error);
                }
                return this.adapter.db.query(`CALL create_update_user_with_roles('${encodedUserData}','${createdBy}','${ctx.params.birthday}', '${ctx.params.status}','${ctx.params.username}','${ctx.params.name}', '${ctx.params.phonenumber}', '${ctx.params.email}', '${sha256(randomPassword)}','${ctx.params.orgid}', '${ctx.params.roleID.toString()}')`)
                    .then((res) => {

                        return resultHandler(1, "Tạo / Update user thành công", {});
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
        updateUserInfo: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/update-info"
            },
            params: {
                username: { type: "string", min: 3, max: 20 },
                name: { type: "string", min: 0, max: 45 },
                phonenumber: { type: "string", min: 0, max: 15 },
                email: { type: "string", min: 0, max: 100 },
                birthday: { type: "string", min: 0, max: 10 },
                userdata: { type: "string" },
                status: { type: "string", min: 2, max: 4 }
            },
            async handler(ctx) {
                let encodedUserData
                if (ctx.params.userdata != '') {
                    try {
                        encodedUserData = tokenManager.createToken(JSON.parse(ctx.params.userdata))
                    } catch (error) {
                        return new MoleculerError('Lỗi hệ thống', 500, 'LG_ERROR', error);
                    }
                }
                else
                    encodedUserData = tokenManager.createToken(JSON.parse('{}'));

                return this.adapter.db.query(`CALL update_user_info('${encodedUserData}','${ctx.params.birthday}','${ctx.params.status}','${ctx.params.username}','${ctx.params.name}', '${ctx.params.phonenumber}', '${ctx.params.email}')`)
                    .then((res) => {

                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Update user info thành công", {});
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
        updateUserOrg: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/update-org"
            },
            params: {
                username: { type: "string", min: 3, max: 20 },
                orgid: { type: "string", min: 3, max: 20 }
            },
            async handler(ctx) {

                return this.adapter.db.query(`CALL update_user_org('${ctx.params.username}','${ctx.params.orgid}')`)
                    .then((res) => {

                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Update user org thành công", {});
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
        updateUserPassword: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/update-password"
            },
            params: {
                username: { type: "string", min: 3, max: 20 },
                oldpassword: { type: "string", min: 10, max: 200 },
                newpassword: { type: "string", min: 10, max: 200 },
            },
            async handler(ctx) {
                let userID = tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID;
                if(userID != ctx.params.username)
                return resultHandler(0, "User chỉ có thể thay đổi mật khẩu cho tài khoản của mình. vui lòng liên hệ QTV hệ thống", {});
                else if (!this.isPasswordInTheRightFormat(ctx.params.newpassword))
                    return resultHandler(0, "Mật khẩu phải thỏa tối thiểu 10 ký tự gồm chữ hoa + thường + số đếm + ký tự đặc biệt", {});
                else
                    return this.adapter.db.query(`CALL update_user_password('${ctx.params.username}','${ctx.params.oldpassword}','${ctx.params.newpassword}')`)
                        .then((res) => {

                            this.broker.call("logging.logUserAction", {
                                userID: userID,
                                action: ctx.meta.endpoint,
                                data: JSON.stringify(ctx.params),
                                comment: ctx.meta.clientIp
                            });
                            cacher.del(this.adapter, this.broker, ctx.params.username)
                            //Nếu triển khai DTP update password bên tris
                            if (process.env.DTP.toString() == '1')
                                tris_api.changePassword(ctx.params.username, ctx.params.newpassword);
                            return resultHandler(1, "Update user password thành công", {});
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
        resetUserPassword: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/reset-password"
            },
            params: {
                username: { type: "string", min: 3, max: 20 }

            },
            async handler(ctx) {
                let user = await this.adapter.db.query(`CALL user_select_by_id('${ctx.params.username}')`)
                // console.log(user)
                if (user.length == 0)
                    return resultHandler(0, "User không tồn tại", {});
                else
                    try {
                        if (process.env.DTP.toString() == '1') {
                            //Sử dụng OTP của DTP
                            let token
                            token = await dtp_otp.getToken();
                            if (token) {
                                let sendOTPresult;
                                sendOTPresult = await dtp_otp.sendOTP(token, user[0]["PhoneNumber"]);
                                if (sendOTPresult) {
                                    return resultHandler(1, 'Gửi mã OTP reset mật khẩu thành công đến số điện thoại người dùng', {});
                                }
                                else
                                    return resultHandler(0, 'Gửi mã OTP reset mật khẩu thất bại. Xin vui lòng thử lại', {});
                            }
                            else
                                return resultHandler(0, 'Gửi mã OTP reset mật khẩu thất bại - Không lấy được token. Xin vui lòng thử lại', {});
                        }
                        else {
                            //Sử dụng OTP của VNPT
                            if (process.env.SKIP_OTP.toString() == '1') {
                                //skip OTP verification -- use default OTP
                                let otp = 'super'
                                cacher.set(this.adapter, this.broker, 'OTP_Reset_Pass_' + user[0].UserID, { otp: otp });
                                return resultHandler(1, "Mã OTP reset password đã được gửi thành công đến số điện thoại/email người dùng.", {});
                            }
                            else {
                                let otp = Math.round(Math.random() * (99999 - 10000) + 10000);
                                let phoneSent = false;
                                let emailSent = false;
                                if (user[0].PhoneNumber != '')
                                    phoneSent = await vnpt_otp.sendSMS(user[0].PhoneNumber, `Ma OTP reset mat khau IVMS la ${otp}`)
                                if (user[0].Email != '')
                                    emailSent = await vnpt_otp.sendEmail(user[0].Email, "OTP hệ thống IVMS", `Mã OTP reset mật khẩu IVMS là ${otp}`)
                                if (phoneSent == true || emailSent == true) {
                                    cacher.set(this.adapter, this.broker, 'OTP_Reset_Pass_' + user[0].UserID, { otp: otp, exp: moment().add(5, 'minutes') });
                                    return resultHandler(1, "Mã OTP reset password đã được gửi thành công đến số điện thoại/email người dùng.", {});
                                }
                                else
                                    return resultHandler(0, "Đã xảy ra lỗi khi gửi mã OTP.", {});
                            }
                        }

                    } catch (error) {
                        return new MoleculerError('Lỗi hệ thống', 500, 'LG_ERROR')
                    }

            }
        },
        verifyResetPassOTP: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/verify-reset-pass-otp"
            },
            params: {
                userID: { type: "string", min: 3, max: 20 },
                otp: { type: "string", min: 5, max: 10 }
            },
            async handler(ctx) {
                let user = await this.adapter.db.query(`CALL user_select_by_id('${ctx.params.userID}')`)
                console.log(user)
                if (user.length == 0)
                    return resultHandler(0, "User không tồn tại", {});
                else {
                    if (process.env.DTP.toString() == '1') {
                        //verify OTP của DTP
                        let token
                        token = await dtp_otp.getToken();
                        if (token) {
                            let verifyOTPresult;
                            verifyOTPresult = await dtp_otp.verifyOTP(token, user[0]["PhoneNumber"], ctx.params.otp);
                            console.log(verifyOTPresult)
                            //Verify OTP thành công
                            if (verifyOTPresult) {
                                return this.adapter.db.query(`CALL reset_user_password('${ctx.params.userID}')`)
                                    .then((res) => {
                                        cacher.del(this.adapter, this.broker, ctx.params.userID)
                                        // this.sendNewPasswordThroughEmail(user[0].Email);
                                        vnpt_otp.sendEmail(user[0].Email, "Thông tin mật khẩu reset từ hệ thống IVMS", 'Mật khẩu sau khi reset của bạn là: Vnpt@12345 Vui lòng thay đổi sau khi đăng nhập trở lại hệ thống.')
                                        // this.sendNewPasswordThroughSMS(user[0].PhoneNumber)
                                        vnpt_otp.sendSMS(user[0].PhoneNumber, `Mat khau IVMS mac dinh sau khi reset cua ban la: Vnpt@12345`)

                                        //Nếu triển khai DTP thì cũng update password bên tris
                                        if (process.env.DTP.toString() == '1')
                                            tris_api.changePassword(ctx.params.userID, 'Vnpt@12345');
                                        return resultHandler(1, "Reset user password thành công", {});
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
                                    });
                            }
                            else
                                return resultHandler(0, 'Xác thực OTP thất bại. Xin vui lòng thử lại', {});
                        }
                        else
                            return resultHandler(0, 'Xác thực OTP thất bại - Không lấy được token. Xin vui lòng thử lại', {});
                    }
                    else {
                        //check cache với otp và user có valid hay ko. 
                        let cacheOTP = await cacher.get(this.adapter, this.broker, 'OTP_Reset_Pass_' + ctx.params.userID);
                        if (process.env.SKIP_OTP.toString() == '1') {
                            //skip OTP verification
                            console.log(ctx.params)
                            if (cacheOTP) {
                                if (ctx.params.otp == 'super') {
                                    return this.adapter.db.query(`CALL reset_user_password('${ctx.params.userID}')`)
                                        .then((res) => {
                                            cacher.del(this.adapter, this.broker, ctx.params.userID)
                                            // this.sendNewPasswordThroughEmail(user[0].Email);
                                            vnpt_otp.sendEmail(user[0].Email, "Thông tin mật khẩu reset từ hệ thống IVMS", 'Mật khẩu sau khi reset của bạn là: Vnpt@12345 Vui lòng thay đổi sau khi đăng nhập trở lại hệ thống.')
                                            vnpt_otp.sendSMS(user[0].PhoneNumber, `Mat khau IVMS mac dinh sau khi reset cua ban la: Vnpt@12345`)

                                            // this.sendNewPasswordThroughSMS(user[0].PhoneNumber)
                                            cacher.del(this.adapter, this.broker, 'OTP_Reset_Pass_' + ctx.params.userID);

                                            return resultHandler(1, "Reset user password thành công", {});
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
                                else {
                                    return resultHandler(0, "Mã OTP không chính xác", {});
                                }
                            }
                            else
                                return Promise.reject(new MoleculerError("Mã OTP không tồn tại", 500, 'OTP_ERR', { 'message': "Mã OTP không tồn tại" }))
                        }
                        else {
                            if (cacheOTP) {
                                if ((moment().valueOf() < moment(cacheOTP.exp).valueOf() && cacheOTP.otp == ctx.params.otp)) {
                                    return this.adapter.db.query(`CALL reset_user_password('${ctx.params.userID}')`)
                                        .then((res) => {
                                            cacher.del(this.adapter, this.broker, ctx.params.userID)
                                            // this.sendNewPasswordThroughEmail(user[0].Email);
                                            vnpt_otp.sendEmail(user[0].Email, "Thông tin mật khẩu reset từ hệ thống IVMS", 'Mật khẩu sau khi reset của bạn là: Vnpt@12345 Vui lòng thay đổi sau khi đăng nhập trở lại hệ thống.')
                                            vnpt_otp.sendSMS(user[0].PhoneNumber, `Mat khau IVMS mac dinh sau khi reset cua ban la: Vnpt@12345`)

                                            // this.sendNewPasswordThroughSMS(user[0].PhoneNumber)
                                            cacher.del(this.adapter, this.broker, 'OTP_Reset_Pass_' + ctx.params.userID);

                                            return resultHandler(1, "Reset user password thành công", {});
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
                                else {
                                    if (moment().valueOf() > moment(cacheOTP.exp).valueOf()) {
                                        cacher.del(this.adapter, this.broker, 'OTP_' + ctx.params.userID);
                                        return Promise.reject(new MoleculerError("Mã OTP đã hết hiệu lực", 500, 'OTP_ERR', { 'message': "Mã OTP đã hết hiệu lực" }))
                                    }
                                    else
                                        return resultHandler(0, "Mã OTP không chính xác", {});
                                }
                            }
                            else
                                return Promise.reject(new MoleculerError("Mã OTP không tồn tại", 500, 'OTP_ERR', { 'message': "Mã OTP không tồn tại" }))
                        }
                    }

                }

            }
        },
        deleteUser: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/delete"
            },
            params: {
                username: { type: "string", min: 3, max: 20 }
            },
            async handler(ctx) {

                return this.adapter.db.query(`CALL delete_user('${ctx.params.username}')`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        //Nếu triển khai DTP thì del acc bên tris
                        if (process.env.DTP.toString() == '1')
                            tris_api.deleteUser(ctx.params.username);
                        return resultHandler(1, "Delete user thành công", {});
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
        selectByID:
        {
            rest: {
                method: "POST",
                path: "/get-by-id"
            },
            params: {
                userID: { type: "string", min: 3, max: 20 }
            },
            async handler(ctx) {
                try {
                    let userInfo = await this.adapter.db.query(`CALL user_select_by_id('${ctx.params.userID}')`)
                    if (userInfo.length > 0) {
                        userInfo[0].UserData = tokenManager.decodeToken(userInfo[0].UserData);
                        delete userInfo[0].UserData.exp;
                        delete userInfo[0].UserData.iat;
                        delete userInfo[0].RoleID
                        console.log(userInfo[0])
                        let getUserPermissionResult = await this.adapter.db.query(`CALL find_user_permission_and_role('${ctx.params.userID}')`)

                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        return resultHandler(1, "Select thành công", { "role_permission": getUserPermissionResult, "user_info": userInfo[0] });
                    }
                    else
                        return resultHandler(0, "User không tồn tại", { res });

                } catch (error) {
                    return new MoleculerError('Lỗi hệ thống', 500, 'LG_ERROR')
                }
            }
        },
        selectMultipleByOrgID:
        {
            rest: {
                method: "POST",
                path: "/get-multiple"
            },
            params: {
                currentPage: { type: "number", min: 0, max: 1000 },
                limit: { type: "number", min: 1, max: 100 },
                isGetAll: { type: "number", min: 0, max: 1 },
                filter: { type: "array" }
            },
            async handler(ctx) {

                let userID = tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID
                let totalPage = 0
                if (ctx.params.isGetAll == 0)
                    totalPage = await this.adapter.db.query(`CALL user_getTotalPageNum('${userID}')`);

                return this.adapter.db.query(`CALL user_select_multiple('${ctx.params.currentPage}', '${ctx.params.limit}', '${ctx.params.isGetAll}','${userID}')`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });

                        let result = res;
                        if (ctx.params.filter.length > 0) {
                            result = filterArray.filterArray(result, ctx.params.filter)
                        }

                        if (ctx.params.isGetAll == 1)
                            return resultHandler(1, "Select thành công", { result });
                        else (ctx.params.isGetAll == 0)
                        {
                            let totalPageNum = Math.round(totalPage.length / ctx.params.limit);
                            if (totalPage.length > 0 && totalPageNum == 0)
                                totalPageNum = 1;
                            return resultHandler(1, "Select thành công", {
                                totalPage: totalPageNum,
                                data: result
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
        getUserRolePermission_TreeGrid:
        {
            rest: {
                method: "POST",
                path: "/get-multiple-treegrid"
            },
            params: {
                filter: { type: "array" }
            },
            async handler(ctx) {
                return this.adapter.db.query(`CALL user_get_multiple_treegrid()`)
                    .then((res) => {
                        this.broker.call("logging.logUserAction", {
                            userID: tokenManager.decodeToken(ctx.meta.reqHeaders.token).userID,
                            action: ctx.meta.endpoint,
                            data: JSON.stringify(ctx.params),
                            comment: ctx.meta.clientIp
                        });
                        let result = res;
                        if (ctx.params.filter.length > 0) {
                            result = filterArray.filterArray(result, ctx.params.filter)
                        }
                        return resultHandler(1, "Lấy danh sách thành công", this.getUserRolePermission_TreeGrid_Formatter(result));
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
        testabc: {
            rest: {
                method: "GET",
                path: "/getabc"
            },
            async handler(ctx) {

                return this.adapter.db.query(`CALL find_all_users_with_role('super_admin')`)
                    .then((res) => {
                        return resultHandler(1, "Select thành công", { res });
                    }
                    )
                    .catch(err => {
                        let error = () => {
                            try {
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
        forceUserResetUserPassword: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/force-reset-password"
            },
            params: {
                username: { type: "string", min: 3, max: 20 },
                newpassword: { type: "string", min: 10, max: 200 }
            },
            async handler(ctx) {
                let user = await this.adapter.db.query(`CALL user_select_by_id('${ctx.params.username}')`)
                if (user.length == 0)
                    return resultHandler(0, "User không tồn tại", {});
                else if (!this.isPasswordInTheRightFormat(ctx.params.newpassword))
                    return resultHandler(0, "Mật khẩu phải thỏa tối thiểu 8 ký tự gồm chữ hoa + thường + số đếm + ký tự đặc biệt", {});
                else
                    return this.adapter.db.query(`CALL force_reset_user_password('${ctx.params.username}', '${ctx.params.newpassword}')`)
                        .then((res) => {
                            cacher.del(this.adapter, this.broker, ctx.params.username);
                            //Nếu triển khai DTP thì cũng update password bên tris
                            if (process.env.DTP.toString() == '1')
                                tris_api.changePassword(ctx.params.username, ctx.params.newpassword);
                            return resultHandler(1, "Reset user password thành công", {});
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
        getUserRolePermission_TreeGrid_Formatter(array) {
            let returnArray = [];
            const groupByKey = (list, key, { omitKey = false }) => list.reduce((hash, { [key]: value, ...rest }) => ({ ...hash, [value]: (hash[value] || []).concat(omitKey ? { ...rest } : { [key]: value, ...rest }) }), {})
            let groupedObject = groupByKey(array, 'UserID', { omitKey: true });

            for (const property in groupedObject) {
                // console.log(groupedObject[property]);
                let data = {
                    data: {
                        "UserID": property.toString(),
                        "OrgID": groupedObject[property][0].OrgID,
                        "PermissionID": '',
                        "RoleID": '',
                        "CreatedOn": groupedObject[property][0].CreatedOn,
                        "ModifiedOn": groupedObject[property][0].ModifiedOn,
                        "Status": groupedObject[property][0].Status
                    },
                    children: []
                }

                if (groupedObject[property][0].RoleID != null) {
                    data.children = this.getRolePermission_TreeGrid_Formatter(groupedObject[property])
                    data.data.RoleID = data.children.length
                }
                else {
                    data.data.RoleID = "0"
                    data.data.PermissionID = "0"
                    delete data.children
                }

                returnArray.push(data)
            }
            return returnArray
        },
        getRolePermission_TreeGrid_Formatter(array) {

            let returnArray = [];
            const groupByKey = (list, key, { omitKey = false }) => list.reduce((hash, { [key]: value, ...rest }) => ({ ...hash, [value]: (hash[value] || []).concat(omitKey ? { ...rest } : { [key]: value, ...rest }) }), {})
            let groupedObject = groupByKey(array, 'RoleID', { omitKey: true });

            for (const property in groupedObject) {
                // console.log(`${property}: ${groupedObject[property]}`);
                let data = {
                    data: {
                        "UserID": '',
                        "OrgID": '',
                        "PermissionID": groupedObject[property].length.toString(),
                        "RoleID": property.toString(),
                        "CreatedOn": groupedObject[property][0].CreatedOn,
                        "ModifiedOn": groupedObject[property][0].ModifiedOn
                    },
                    children: []
                }
                for (let i = 0; i < groupedObject[property].length; ++i) {
                    groupedObject[property][i]["RoleID"] = ''
                    groupedObject[property][i]["UserID"] = ''
                    groupedObject[property][i]["OrgID"] = ''
                    data.children.push({ "data": groupedObject[property][i] })
                }
                returnArray.push(data)
            }
            return returnArray
        },
        generatePassword(length, addUpper, addNumbers, addSymbols) {
            const passwordLength = length || 12;
            const lowerCharacters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
            const upperCharacters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
            const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
            const symbols = ['!', '?', '@'];
            const getRandom = array => array[Math.floor(Math.random() * array.length)];
            let finalCharacters = '';
            if (addUpper) {
                finalCharacters = finalCharacters.concat(getRandom(upperCharacters));
            }
            if (addNumbers) {
                finalCharacters = finalCharacters.concat(getRandom(numbers));
            }
            if (addSymbols) {
                finalCharacters = finalCharacters.concat(getRandom(symbols));
            }
            for (let i = 1; i < passwordLength - 3; i++) {
                finalCharacters = finalCharacters.concat(getRandom(lowerCharacters));
            }
            return finalCharacters.split('').sort(() => 0.5 - Math.random()).join('');
        },
        isPasswordInTheRightFormat(str) {
            let pattern = new RegExp(
                "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[-+_!@#$%^&*.,?]).+$"
            );

            // If the string is empty or does not meet the minimum
            // then print No
            if (!str || str.length === 0 || str.length < 10) {
                return false;
            }
            // Print Yes If the string matches
            // with the Regex
            if (pattern.test(str)) {
                return true;
            } else {
                return false;
            }
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
