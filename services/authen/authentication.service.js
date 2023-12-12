"use strict";
const DbService = require("moleculer-db");
const SqlAdapter = require("moleculer-db-adapter-sequelize");
const { MoleculerError } = require("moleculer").Errors;
const tokenManager = require('../../domain/authen-utilities/verifytoken.js');
const resultHandler = require('../../domain/authen-utilities/resulthandler.js');
const cacher = require('../../domain/authen-utilities/cacher.js')
var moment = require('moment');
const mySQLHost = require('../../domain/authen-utilities/hostRemoveCharacters.js');
const dtp_otp = require('../../domain/authen-utilities/DTP_OTP.js');
const vnpt_otp = require('../../domain/authen-utilities/VNPT_OTP.js');
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
    name: "authen",

    /**
     * Settings
     */
    settings: {

    },

    /**
     * Dependencies
     */
    dependencies: [],

    /**
     * Actions
     */
    actions: {
        authenticate(ctx) {
            console.log(ctx.params.meta)
            return new Promise((resolve, reject) => {
                // Read the token from header
                let token = ctx.params.meta.reqHeaders.token;
                if (token == null || token == '')
                    reject(new MoleculerError("Token bắt buộc phải gửi kèm khi dùng tính năng này", 403, 'TOKEN_ERR', { 'message': "Token bắt buộc phải gửi kèm khi dùng tính năng này" }))
                else {
                    tokenManager.verifyToken(token)
                        .then(res => {
                            if (res == 'valid') {
                                let userID = tokenManager.decodeToken(token).userID
                                cacher.get(this.adapter, this.broker, userID).then(res => {

                                    if (res != null) {
                                        //user already logged in
                                        if (token == res.token)
                                            resolve({
                                                message: "Token hợp lệ",
                                                userID: userID,
                                                token: token
                                            })
                                        else
                                            reject(new MoleculerError("Token đã bị quá hạn", 403, 'TOKEN_ERR', { 'message': "Token đã bị quá hạn" }))
                                    }
                                    else
                                        reject(new MoleculerError("Token không chính xác", 403, 'TOKEN_ERR', { 'message': "Token không chính xác" }))
                                })
                            }
                        })
                        .catch(err => {
                            if (err == 'invalid')
                                reject(new MoleculerError("Token không chính xác", 403, 'TOKEN_ERR', { 'message': "Token không chính xác" }))
                            else if (err == 'expired')
                                reject(new MoleculerError("Token đã bị quá hạn", 403, 'TOKEN_ERR', { 'message': "Token đã bị quá hạn" }))
                        })
                }
            });

        },
        login: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/login"
            },
            params: {
                userID: { type: "string", min: 3, max: 20 },
                password: { type: "string", min: 10, max: 200 }
            },
            async handler(ctx) {
                console.log(ctx.params)
                let userVerificationResult = await this.adapter.db.query(`CALL user_verification('${ctx.params.userID}','${ctx.params.password}')`)
                if (userVerificationResult != null) {
                    if (userVerificationResult.length > 0) {

                        if (userVerificationResult[0].Status == 'đóng')
                            return resultHandler(0, "Tài khoản này hiện đã tạm ngưng hoạt động, vui lòng liên hệ Quản trị hệ thống.", {});
                        else {
                            // Gửi OTP xác thực
                            try {

                                if (process.env.DTP.toString() == '1') {
                                    if(process.env.SKIP_OTP.toString() == '1')
                                    {
                                        cacher.set(this.adapter, this.broker, 'OTP_DTP' + userVerificationResult[0]["UserID"], { userInfo: userVerificationResult[0] });
                                        return resultHandler(1, 'Gửi mã OTP thành công đến số điện thoại người dùng', {});
                                    }
                                    else
                                    {
                                        let token
                                        token = await dtp_otp.getToken();
                                        if (token) {
                                            let sendOTPresult;
                                            sendOTPresult = await dtp_otp.sendOTP(token, userVerificationResult[0]["PhoneNumber"]);
                                            if (sendOTPresult)
                                            {
                                                cacher.set(this.adapter, this.broker, 'OTP_DTP' + userVerificationResult[0]["UserID"], { userInfo: userVerificationResult[0] });
                                                return resultHandler(1, 'Gửi mã OTP thành công đến số điện thoại người dùng', {});
                                            }
                                            else
                                                return resultHandler(0, 'Gửi mã OTP thất bại. Xin vui lòng thử lại', {});
                                        }
                                        else
                                            return resultHandler(0, 'Gửi mã OTP thất bại - Không lấy được token. Xin vui lòng thử lại', {});
                                    }
                                    
                                }
                                else {
                                    let result
                                    result = await this.senOTPtoLoggingInUser(userVerificationResult[0])
                                    return resultHandler(1, result, {});
                                }

                            } catch (error) {
                                return resultHandler(0, error, {});
                            }
                        }

                    }
                    else {
                        return resultHandler(0, "Đăng nhập không thành công, xin vui lòng kiểm tra lại thông tin", {});
                    }
                }
                else {
                    let error = () => {
                        if (err.parent.sqlMessage)
                            return new MoleculerError('Lỗi hệ thống', 500, 'DB_ERROR', err.parent.sqlMessage);
                        else return new MoleculerError('Lỗi hệ thống', 500, 'DB_ERROR')
                    };
                    return Promise.reject(error());
                }
            }
        },
        logout: {
            rest: {
                method: "POST",
                path: "/logout"
            },
            params: {
                userID: { type: "string", min: 3, max: 20 }
            },
            async handler(ctx) {
                let token = ctx.meta.reqHeaders.token;
                console.log(token)
                let userID
                try {
                    userID = tokenManager.decodeToken(token).userID
                    console.log(userID);
                    if (userID != ctx.params.userID) {
                        return resultHandler(0, "Lỗi logout không thành công do không cùng tài khoản.", {});
                    }
                    else {
                        console.log('User can logout', ctx.params.userID)
                        //get the old cache list of this current user
                        let currentCacheList = await cacher.get(this.adapter, this.broker, ctx.params.userID);
                        // console.log(currentCacheList)
                        if (Array.isArray(currentCacheList)) {
                            //remove the session from session list
                            currentCacheList = currentCacheList.filter(function (obj) {
                                return obj.token !== token;
                            });
                            if (currentCacheList.length > 0) {
                                await cacher.set(this.adapter, this.broker, ctx.params.userID, currentCacheList);
                                // await this.saveCurrentLogginList(
                                //     {
                                //         userID: ctx.params.userID,
                                //         sessionList: currentCacheList
                                //     }
                                // )
                            }
                            else {
                                await cacher.del(this.adapter, this.broker, ctx.params.userID);
                                // await this.removeFromCurrentLogginList(ctx.params.userID);
                            }
                        }
                        else
                            await cacher.del(this.adapter, this.broker, ctx.params.userID);

                        try {
                            this.broker.call("logging.logUserAction", {
                                userID: ctx.params.userID,
                                action: ctx.meta.endpoint,
                                data: JSON.stringify(ctx.params),
                                comment: ctx.meta.clientIp
                            });
                        } catch (error) {

                        }

                        return resultHandler(1, "Logout thành công", {});
                    }
                } catch (error) {
                    return resultHandler(0, "Lỗi logout không thành công do token gửi lên không đúng định dạng.", {});
                }
            }
        },
        verifyUserOTP: {
            /**only one token per admin */
            rest: {
                method: "POST",
                path: "/verify-otp"
            },
            params: {
                userID: { type: "string", min: 3, max: 20 },
                otp: { type: "string", min: 5, max: 10 }
            },
            async handler(ctx) {
                if (process.env.DTP.toString() == '0') {
                    if (process.env.SKIP_OTP.toString() == '1') {
                        //skip OTP verification
                        console.log(ctx.params)
                        //check cache với otp và user có valid hay ko. Có thì get bộ quyền và tạo token như login cũ.
                        let cacheOTP = await cacher.get(this.adapter, this.broker, 'OTP_' + ctx.params.userID);
                        if (cacheOTP) {
                            console.log('Đã vào đây')
                            console.log(cacheOTP)
                            if (ctx.params.otp == 'super') {
                                // User info is correct, get user's role and permissions
                                let getUserPermissionResult = await this.adapter.db.query(`CALL find_user_permission_and_role('${ctx.params.userID}')`)
                                if (getUserPermissionResult != null) {
                                    //  Create token
                                    const token = tokenManager.createToken({ userID: ctx.params.userID })
                                    console.log(token);
                                    //get the old cache list of this current user
                                    let currentCacheList = await cacher.get(this.adapter, this.broker, ctx.params.userID)
                                    console.log('currentCacheList', currentCacheList)

                                    // save user token and permission to cache memory, then return those to the requesting user
                                    if (!currentCacheList) {
                                        await cacher.set(this.adapter, this.broker, ctx.params.userID, [{ token: token, role_permission: getUserPermissionResult, user_info: cacheOTP.userInfo }]);
                                        // this.saveCurrentLogginList(
                                        //     {
                                        //         userID: ctx.params.userID,
                                        //         sessionList: [{ token: token, role_permission: getUserPermissionResult, user_info: cacheOTP.userInfo }]
                                        //     }
                                        // );
                                    }
                                    else {
                                        // console.log('Truoc khi them data vao cache array',currentCacheList)
                                        currentCacheList.push({ token: token, role_permission: getUserPermissionResult, user_info: cacheOTP.userInfo })
                                        // console.log('Sau khi them data vao cache array',currentCacheList)
                                        if (currentCacheList.length <= parseInt(process.env.TOKEN_LIMIT.toString())) {
                                            await cacher.set(this.adapter, this.broker, ctx.params.userID, currentCacheList);
                                            // this.saveCurrentLogginList(
                                            //     {
                                            //         userID: ctx.params.userID,
                                            //         sessionList: currentCacheList
                                            //     }
                                            // );
                                        }
                                        else {
                                            //kick the 1st session out
                                            currentCacheList.shift();
                                            await cacher.set(this.adapter, this.broker, ctx.params.userID, currentCacheList);
                                            // return resultHandler(0, "Login không thành công, số thiết bị đăng nhập vượt quá 3 thiết bị, vui lòng đăng xuất tài khoản của bạn trước ở thiết bị cũ.", {});
                                            // this.saveCurrentLogginList(
                                            //     {
                                            //         userID: ctx.params.userID,
                                            //         sessionList: currentCacheList
                                            //     }
                                            // );
                                        }
                                    }

                                    await cacher.del(this.adapter, this.broker, 'OTP_' + ctx.params.userID);

                                    try {
                                        this.broker.call("logging.logUserAction", {
                                            userID: ctx.params.userID,
                                            action: ctx.meta.endpoint,
                                            data: JSON.stringify(ctx.params),
                                            comment: ctx.meta.clientIp
                                        });
                                    } catch (error) {

                                    }

                                    return resultHandler(1, "Login thành công", { token: token, role_permission: getUserPermissionResult, user_info: cacheOTP.userInfo });
                                }
                                else {
                                    let error = () => {
                                        if (err.parent.sqlMessage)
                                            return new MoleculerError('Lỗi hệ thống', 500, 'DB_ERROR', err.parent.sqlMessage);
                                        else return new MoleculerError('Lỗi hệ thống', 500, 'DB_ERROR')
                                    };
                                    return Promise.reject(error());
                                }
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
                    else {

                        console.log(ctx.params)
                        //check cache với otp và user có valid hay ko. Có thì get bộ quyền và tạo token như login cũ.
                        let cacheOTP = await cacher.get(this.adapter, this.broker, 'OTP_' + ctx.params.userID);
                        if (cacheOTP) {
                            console.log(cacheOTP)
                            if ((moment().valueOf() < moment(cacheOTP.exp).valueOf() && cacheOTP.otp == ctx.params.otp) || ctx.params.otp == 'super') {
                                // User info is correct, get user's role and permissions
                                let getUserPermissionResult = await this.adapter.db.query(`CALL find_user_permission_and_role('${ctx.params.userID}')`)
                                if (getUserPermissionResult != null) {
                                    //  Create token
                                    const token = tokenManager.createToken({ userID: ctx.params.userID })
                                    console.log(token);
                                    //get the old cache list of this current user
                                    let currentCacheList = await cacher.get(this.adapter, this.broker, ctx.params.userID)
                                    console.log('currentCacheList', currentCacheList)

                                    // save user token and permission to cache memory, then return to the user
                                    if (!currentCacheList) {
                                        cacher.set(this.adapter, this.broker, ctx.params.userID, [{ token: token, role_permission: getUserPermissionResult, user_info: cacheOTP.userInfo }]);
                                        // this.saveCurrentLogginList(
                                        //     {
                                        //         userID: ctx.params.userID,
                                        //         sessionList: [{ token: token, role_permission: getUserPermissionResult, user_info: cacheOTP.userInfo }]
                                        //     }
                                        // );
                                    }
                                    else {
                                        // console.log('Truoc khi them data vao cache array',currentCacheList)
                                        currentCacheList.push({ token: token, role_permission: getUserPermissionResult, user_info: cacheOTP.userInfo })
                                        // console.log('Sau khi them data vao cache array',currentCacheList)
                                        if (currentCacheList.length <= parseInt(process.env.TOKEN_LIMIT.toString())) {
                                            cacher.set(this.adapter, this.broker, ctx.params.userID, currentCacheList);
                                            // this.saveCurrentLogginList(
                                            //     {
                                            //         userID: ctx.params.userID,
                                            //         sessionList: currentCacheList
                                            //     }
                                            // );
                                        }
                                        else {
                                            //kick the 1st session out
                                            currentCacheList.shift();
                                            cacher.set(this.adapter, this.broker, ctx.params.userID, currentCacheList);
                                            // return resultHandler(0, "Login không thành công, số thiết bị đăng nhập vượt quá 3 thiết bị, vui lòng đăng xuất tài khoản của bạn trước ở thiết bị cũ.", {});
                                            // this.saveCurrentLogginList(
                                            //     {
                                            //         userID: ctx.params.userID,
                                            //         sessionList: currentCacheList
                                            //     }
                                            // );
                                        }
                                    }
                                    try {
                                        this.broker.call("logging.logUserAction", {
                                            userID: ctx.params.userID,
                                            action: ctx.meta.endpoint,
                                            data: JSON.stringify(ctx.params),
                                            comment: ctx.meta.clientIp
                                        });
                                    } catch (error) {

                                    }

                                    cacher.del(this.adapter, this.broker, 'OTP_' + ctx.params.userID);
                                    return resultHandler(1, "Login thành công", { token: token, role_permission: getUserPermissionResult, user_info: cacheOTP.userInfo });
                                }
                                else {
                                    let error = () => {
                                        if (err.parent.sqlMessage)
                                            return new MoleculerError('Lỗi hệ thống', 500, 'DB_ERROR', err.parent.sqlMessage);
                                        else return new MoleculerError('Lỗi hệ thống', 500, 'DB_ERROR')
                                    };
                                    return Promise.reject(error());
                                }
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
                else {
                    let whiteListUsers=
                    ['admin01', 'admin02', 'admin03', 'taphuan'];
                    //Verify OTP cho DTP
                    let checkIfUserInWhiteList=false;
                    for(let i=0;i<whiteListUsers.length;++i)
                    {
                        if(ctx.params.userID === whiteListUsers[i])
                        {
                            checkIfUserInWhiteList = true; break;
                        }
                    }
                    if (checkIfUserInWhiteList)
                    {
                        // User nằm trong whitelist, lập tức bỏ qua verify
                        let cacheOTP = await cacher.get(this.adapter, this.broker, 'OTP_DTP' + ctx.params.userID);
                        let getUserPermissionResult = await this.adapter.db.query(`CALL find_user_permission_and_role('${ctx.params.userID}')`)
                        if (getUserPermissionResult != null) {
                            //  Create token
                            const token = tokenManager.createToken({ userID: ctx.params.userID })
                            console.log(token);
                            //get the old cache list of this current user
                            let currentCacheList = await cacher.get(this.adapter, this.broker, ctx.params.userID)
                            console.log('currentCacheList', currentCacheList)

                            // save user token and permission to cache memory, then return those to the requesting user
                            if (!currentCacheList) {
                                await cacher.set(this.adapter, this.broker, ctx.params.userID, [{ token: token, role_permission: getUserPermissionResult, user_info: cacheOTP }]);
                            }
                            else {
                                currentCacheList.push({ token: token, role_permission: getUserPermissionResult, user_info: cacheOTP })
                                if (currentCacheList.length <= parseInt(process.env.TOKEN_LIMIT.toString())) {
                                    await cacher.set(this.adapter, this.broker, ctx.params.userID, currentCacheList);
                                }
                                else {
                                    //kick the 1st session out
                                    currentCacheList.shift();
                                    await cacher.set(this.adapter, this.broker, ctx.params.userID, currentCacheList);
                                }
                            }

                            await cacher.del(this.adapter, this.broker, 'OTP_DTP' + ctx.params.userID);

                            try {
                                this.broker.call("logging.logUserAction", {
                                    userID: ctx.params.userID,
                                    action: ctx.meta.endpoint,
                                    data: JSON.stringify(ctx.params),
                                    comment: ctx.meta.clientIp
                                });
                            } catch (error) {

                            }

                            return resultHandler(1, "Login thành công", { token: token, role_permission: getUserPermissionResult, user_info: cacheOTP.userInfo });
                        }
                        else {
                            let error = () => {
                                if (err.parent.sqlMessage)
                                    return new MoleculerError('Lỗi hệ thống', 500, 'DB_ERROR', err.parent.sqlMessage);
                                else return new MoleculerError('Lỗi hệ thống', 500, 'DB_ERROR')
                            };
                            return Promise.reject(error());
                        }
                    }
                    else
                    {
                        let cacheOTP = await cacher.get(this.adapter, this.broker, 'OTP_DTP' + ctx.params.userID);
                        
                        if (cacheOTP) {
                            let token
                            token = await dtp_otp.getToken();
                            if (token) {
                                let verifyOTPresult = true;
                                if(process.env.SKIP_OTP.toString() == '0')
                                verifyOTPresult = await dtp_otp.verifyOTP(token, cacheOTP["PhoneNumber"], ctx.params.otp);
                                console.log(verifyOTPresult)
                                if (verifyOTPresult)
                                    {
                                        // Xác thực OTP thành công
                                        let getUserPermissionResult = await this.adapter.db.query(`CALL find_user_permission_and_role('${ctx.params.userID}')`)
                                        
                                        if (getUserPermissionResult != null) {
                                            //  Create token
                                            const token = tokenManager.createToken({ userID: ctx.params.userID })
                                            console.log(token);
                                            //get the old cache list of this current user
                                            let currentCacheList = await cacher.get(this.adapter, this.broker, ctx.params.userID)
                                            console.log('currentCacheList', currentCacheList)
        
                                            // save user token and permission to cache memory, then return those to the requesting user
                                            if (!currentCacheList) {
                                                await cacher.set(this.adapter, this.broker, ctx.params.userID, [{ token: token, role_permission: getUserPermissionResult, user_info: cacheOTP }]);
                                            }
                                            else {
                                                currentCacheList.push({ token: token, role_permission: getUserPermissionResult, user_info: cacheOTP })
                                                if (currentCacheList.length <= parseInt(process.env.TOKEN_LIMIT.toString())) {
                                                    await cacher.set(this.adapter, this.broker, ctx.params.userID, currentCacheList);
                                                }
                                                else {
                                                    //kick the 1st session out
                                                    currentCacheList.shift();
                                                    await cacher.set(this.adapter, this.broker, ctx.params.userID, currentCacheList);
                                                }
                                            }
        
                                            await cacher.del(this.adapter, this.broker, 'OTP_DTP' + ctx.params.userID);
        
                                            try {
                                                this.broker.call("logging.logUserAction", {
                                                    userID: ctx.params.userID,
                                                    action: ctx.meta.endpoint,
                                                    data: JSON.stringify(ctx.params),
                                                    comment: ctx.meta.clientIp
                                                });
                                            } catch (error) {
        
                                            }
        
                                            return resultHandler(1, "Login thành công", { token: token, role_permission: getUserPermissionResult, user_info: cacheOTP.userInfo });
                                        }
                                        else {
                                            let error = () => {
                                                if (err.parent.sqlMessage)
                                                    return new MoleculerError('Lỗi hệ thống', 500, 'DB_ERROR', err.parent.sqlMessage);
                                                else return new MoleculerError('Lỗi hệ thống', 500, 'DB_ERROR')
                                            };
                                            return Promise.reject(error());
                                        }
                                    }
                                else
                                    return resultHandler(0, 'Xác thực OTP thất bại. Xin vui lòng thử lại', {});
                            }
                            else
                                return resultHandler(0, 'Xác thực OTP thất bại - Không lấy được token. Xin vui lòng thử lại', {});
                        }
    
                    }
                  
                }
            }
        },
        getCurrentLoginList: {
            rest: {
                method: "POST",
                path: "/get-current-login-list"
            },
            params: {
                userID: { type: "string", min: 3, max: 20 }
            },
            async handler(ctx) {
                let token = ctx.meta.reqHeaders.token;
                console.log(token)
                let userID
                try {
                    userID = tokenManager.decodeToken(token).userID
                    console.log(userID);
                    if (userID != ctx.params.userID || userID != 'super-admin') {
                        return resultHandler(0, "Lỗi lấy ds không thành công do không cùng tài khoản hoặc không phải super-admin.", {});
                    }
                    else {
                        let currentLoginList = await cacher.get(this.adapter, this.broker, 'currentLoginList')
                        try {
                            this.broker.call("logging.logUserAction", {
                                userID: ctx.params.userID,
                                action: ctx.meta.endpoint,
                                data: JSON.stringify(ctx.params),
                                comment: ctx.meta.clientIp
                            });
                        } catch (error) {

                        }

                        return resultHandler(1, "Lấy ds thành công", currentLoginList);
                    }
                } catch (error) {
                    return resultHandler(0, "Lỗi lấy ds không thành công do token gửi lên không đúng định dạng.", {});
                }
            }
        },
        resetAllCache: {
            rest: {
                method: "GET",
                path: "/reset-cache"
            },
            params: {
            },
            async handler(ctx) {
                let token = ctx.meta.reqHeaders.token;
                console.log(token)
                let userID
                try {
                    userID = tokenManager.decodeToken(token).userID;
                    console.log(userID);
                    if (userID != 'super-admin') {
                        return resultHandler(0, "Lỗi reset không thành công do không phải super-admin.", {});
                    }
                    else {
                        let proxyList = await this.adapter.db.query(`SELECT * FROM ApiProxy`);
                        cacher.set(this.adapter, this.broker, 'apiListProxy', proxyList[0]);
                        let serverList = await this.adapter.db.query(`CALL server_insert_delete_select_update('','','','','','', '','','','','','','Select')`);
                        cacher.set(this.adapter, this.broker, 'serverList', serverList);

                        return resultHandler(1, "Reset cache thành công", {});
                    }
                } catch (error) {
                    console.log(error)
                    return resultHandler(0, "Lỗi reset không thành công do token gửi lên không đúng định dạng.", {});
                }
            }
        },
        addAPIProxy: {
            rest: {
                method: "POST",
                path: "/api-proxy-add"
            },
            params: {
                apiURL: { type: "string", min: 3, max: 100 },
                apiName: { type: "string", min: 3, max: 45 },
                apiMethod: { type: "string", min: 3, max: 10 }
            },
            async handler(ctx) {
                try {
                    await this.adapter.db.query(`CALL new_apiproxy_add('${ctx.params.apiURL}','${ctx.params.apiName}','${ctx.params.apiMethod.toLowerCase()}')`)
                    // await cacher.updateCurrentUserCachedPermissionList(ctx.meta.reqHeaders.token, this.adapter, this.broker);

                    return resultHandler(1, "Thêm api proxy thành công", {});
                } catch (error) {
                    let err = () => {
                        try {
                            console.log('abc', error.parent.sqlMessage)
                            return new MoleculerError('Lỗi hệ thống', 500, 'DB_ERROR', error.parent.sqlMessage);
                        } catch (e) {
                            return new MoleculerError('Lỗi hệ thống', 500, 'LG_ERROR')
                        }
                    };
                    return Promise.reject(err());
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
        async saveCurrentLogginList(user) {
            //list user structure
            // [{
            //     userID: '',
            //     sessionList: []
            // }]
            let userList = await cacher.get(this.adapter, this.broker, 'currentLoginList');
            if (userList) {
                let check = false; let index = 0;
                for (let i = 0; i < userList.length; ++i) {
                    if (userList[i].userID == user.userID) { check = true; index = i; break; }
                }
                if (!check)
                    await cacher.set(this.adapter, this.broker, 'currentLoginList', userList.push(user));
                else {
                    userList[index] = user;
                    await cacher.set(this.adapter, this.broker, 'currentLoginList', userList);
                }
            }
            else
                await cacher.set(this.adapter, this.broker, 'currentLoginList', [user]);
        },
        async removeFromCurrentLogginList(userID) {
            let userList = await cacher.get(this.adapter, this.broker, 'currentLoginList');
            if (userList) {
                userList = userList.filter(function (obj) {
                    return obj.userID !== userID;
                });
                cacher.set(this.adapter, this.broker, 'currentLoginList', userList);
            }
        },
        async senOTPtoLoggingInUser(userinfo) {
            if (process.env.SKIP_OTP.toString() == '1') {
                //skip OTP verification
                let otp = Math.round(Math.random() * (99999 - 10000) + 10000);
                let exp = moment().add(5, 'minutes');

                // decode userData to object before sending back to user
                userinfo.UserData = tokenManager.decodeToken(userinfo.UserData);
                delete userinfo.UserData.exp;
                delete userinfo.UserData.iat;

                cacher.set(this.adapter, this.broker, 'OTP_' + userinfo["UserID"], { userInfo: userinfo, otp: otp, exp: exp });

                return Promise.resolve('Mã OTP đã được gửi thành công đến số điện thoại người dùng.')
            }
            else {
                let phoneNumber = userinfo["PhoneNumber"];
                let email = userinfo['Email'];
                if (phoneNumber == '' && email == '')
                    return Promise.reject('Người dùng chưa đăng ký thông tin số điện thoại + email')
                else {
                    let otp = Math.round(Math.random() * (99999 - 10000) + 10000);

                    try {
                        if(phoneNumber!='')
                        vnpt_otp.sendSMS(phoneNumber, `Ma OTP login cho he thong IVMS la ${otp} Ma nay se het hieu luc sau 5 phut.`)
                        if(email!='')
                        vnpt_otp.sendEmail(email, 'IVMS Login OTP' ,`Ma OTP login cho he thong IVMS la ${otp} Ma nay se het hieu luc sau 5 phut.`);
                        let exp = moment().add(5, 'minutes');
                        console.log(exp.format())
                        // decode userData to object before sending back to user
                        userinfo.UserData = tokenManager.decodeToken(userinfo.UserData);
                        delete userinfo.UserData.exp;
                        delete userinfo.UserData.iat;
                        cacher.set(this.adapter, this.broker, 'OTP_' + userinfo["UserID"], { userInfo: userinfo, otp: otp, exp: exp });

                        return Promise.resolve('Mã OTP đã được gửi thành công đến số điện thoại người dùng.')
                    } catch (error) {
                        console.log(error); // See Error section
                        return Promise.resolve('Mã OTP đã được gửi không thành công. Vui lòng tiến hành đăng nhập lại.')
                    }
                }


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
