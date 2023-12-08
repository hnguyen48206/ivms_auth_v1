"use strict";

const ApiGateway = require("moleculer-web");
const { MoleculerError } = require("moleculer").Errors;
const tokenManager = require('../domain/authen-utilities/verifytoken.js');
const axios = require('axios');
const DbService = require("moleculer-db");
const SqlAdapter = require("moleculer-db-adapter-sequelize");
const url = require('url');
const cacher = require('../domain/authen-utilities/cacher.js')
var selfForGateway = null
const mySQLHost = require('../domain/authen-utilities/hostRemoveCharacters.js');
const requestIp = require('request-ip');

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 * @typedef {import('http').IncomingMessage} IncomingRequest Incoming HTTP Request
 * @typedef {import('http').ServerResponse} ServerResponse HTTP Server Response
 */

module.exports = {
	name: "api",
	mixins: [ApiGateway, DbService],
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
	// More info about settings: https://moleculer.services/docs/0.14/moleculer-web.html
	settings: {
		// Exposed port
		port: process.env.PORT || 3000,

		// Exposed IP
		ip: "0.0.0.0",

		// Global Express middlewares. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Middlewares
		use: [
		],

		// Global CORS settings for all routes^M
		cors: {
			// Configures the Access-Control-Allow-Origin CORS header.
			origin: "*",
			// Configures the Access-Control-Allow-Methods CORS header.
			methods: ["GET", "OPTIONS", "POST", "PUT", "DELETE"],
			// Configures the Access-Control-Allow-Headers CORS header.
			allowedHeaders: ["*"],
			// Configures the Access-Control-Expose-Headers CORS header.
			exposedHeaders: ["*", "Content-Disposition"],
			// Configures the Access-Control-Allow-Credentials CORS header.
			credentials: false,
			// Configures the Access-Control-Max-Age CORS header.
			maxAge: 3600
		},

		routes: [
			{
				path: "/api",

				whitelist: [
					"**",
				],

				// Route-level Express middlewares. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Middlewares
				use: [
					(req, res, next) => {
						// console.log(req)
						if (selfForGateway == null) {
							let services = req[`$service`].broker.services
							services.forEach(service => {
								if (service.name === 'api')
									selfForGateway = service
							});
							// console.log('Gateway', selfForGateway)
						}

						let endPoint = url.parse(req.url).pathname;
						let ctx = req[`$ctx`]
						// Set request headers to context meta
						// ctx.meta.clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
						ctx.meta.clientIp = requestIp.getClientIp(req); 
						ctx.meta.reqHeaders = req.headers;
						ctx.meta.endpoint = url.parse(req.url).pathname;

						console.log('endpoint', ctx.meta.endpoint);
						console.log('clientIP', ctx.meta.clientIp);

						let byPassList = [
							'/authen/get-current-login-list',
							'/authen/login',
							'/authen/verify-otp',
							'/authen/logout',
							'/authen/api-proxy-add',
							'/user/reset-password',
							'/user/verify-reset-pass-otp',
							'/user/getabc'
						]
						if (!byPassList.includes(ctx.meta.endpoint)) {
							selfForGateway.authenticate(ctx, null, null).then(res => {
								selfForGateway.authorize(ctx, null, null).then(res => {
									if (endPoint.startsWith('/core/')) {
										let ccid = null
										try {
											if (req.body.ccid)
												ccid = req.body.ccid
											else if (req.body.ccId)
												ccid = req.body.ccId
										} catch (error) {

										}
										console.log('ccid', ccid)

										if (ccid !== null) {
											selfForGateway.checkCCIDandFindServer(ccid, req.headers.token).then(server => {
												console.log('Server found', server)
												const serverUrl = server.Domain + ':' + server.Port;
												let redirectURL = serverUrl + req.originalUrl
												console.log('redirectURL', redirectURL);

												axios({
													url: redirectURL.replace('/core', ''),
													headers: {},
													data: req.body,
													method: req.method
												}).then(axiosResponse => {
													// console.log(axiosResponse.data)
													// return Promise.resolve(axiosResponse.data);
													delete server.CameraList
													next(new MoleculerError('', 200, 'REDIRECT_OK', {
														"coreData": axiosResponse.data,
														"serverInfo": server
													}));
												}).catch(err => {
													console.log("Redirect failed", err);
													try {
														next(new MoleculerError('', 500, 'REDIRECT_FAIL', { "errorMessage": err.response.data }));
													} catch (error) {
														next(new MoleculerError('', 500, 'REDIRECT_FAIL', { "errorMessage": err }));
													}
												})

											}).catch(err => {
												next(new MoleculerError('', 500, 'REDIRECT_FAIL', { message: err }));
											})

										}
										else {
											cacher.get(selfForGateway.adapter, selfForGateway.broker, 'apiListProxy').then(apiProxyList => {
												for (let i = 0; i < apiProxyList.length; ++i) {
													if (apiProxyList[i].ApiPath.includes(ctx.meta.endpoint)) {
														console.log('API core ko truyền ccid, thử tìm serverID');
														let serverID = null
														try {
															if (req.body.serverId)
																serverID = req.body.serverId
															else if (req.body.serverId)
																serverID = req.body.serverId
														} catch (error) {

														}
														if (serverID == null)
															next(new MoleculerError('', 500, 'REDIRECT_FAIL', { message: 'API core ko truyền ccid hoặc serverID' }));
														else {
															selfForGateway.findServerOnly(serverID).then(server => {
																console.log('Server found', server);
																if (server != null) {
														
																	const serverUrl = server.Domain + ':' + server.Port;
																	let redirectURL = serverUrl + req.originalUrl
																	console.log('redirectURL', redirectURL);
																	axios({
																		url: redirectURL.replace('/core', ''),
																		headers: {},
																		data: req.body,
																		method: req.method
																	}).then(axiosResponse => {
																		// console.log(axiosResponse.data)
																		// return Promise.resolve(axiosResponse.data);
																		delete server.CameraList
																		next(new MoleculerError('', 200, 'REDIRECT_OK', {
																			"coreData": axiosResponse.data,
																			"serverInfo": server
																		}));
																	}).catch(err => {
																		console.log("Redirect failed", err);
																		try {
																			next(new MoleculerError('', 500, 'REDIRECT_FAIL', { "errorMessage": err.response.data }));
																		} catch (error) {
																			next(new MoleculerError('', 500, 'REDIRECT_FAIL', { "errorMessage": err }));
																		}
																	})
																}
																else
																	next(new MoleculerError('', 500, 'REDIRECT_FAIL', { message: 'Không tìm thấy thông tin server tương ứng với ccid' }));
															})
																.catch(err => {
																	next(err)
																})
														}
													}
												}
											}).catch(err => { next(err) })

										}
									}
									else
										next()
								}).catch(err => {
									next(err)
								})
							}).catch(err => {
								next(err)
							})
						}
						else next()
					}
				],

				// Enable/disable parameter merging method. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Disable-merging
				mergeParams: true,

				// Enable authentication. Implement the logic into `authenticate` method. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Authentication
				authentication: false,

				// Enable authorization. Implement the logic into `authorize` method. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Authorization
				authorization: false,

				// The auto-alias feature allows you to declare your route alias directly in your services.
				// The gateway will dynamically build the full routes from service schema.
				autoAliases: true,

				aliases: {

				},

				cors: {
					// Configures the Access-Control-Allow-Origin CORS header.
					origin: [process.env.CORS],
					// Configures the Access-Control-Allow-Methods CORS header.
					methods: ["GET", "OPTIONS", "POST", "PUT", "DELETE"],
					credentials: true,
				},

				/** 
				 * Before call hook. You can check the request.
				 * @param {Context} ctx 
				 * @param {Object} route 
				 * @param {IncomingRequest} req 
				 * @param {ServerResponse} res 
				 * @param {Object} data
				 */
				async onBeforeCall(ctx, route, req, res) {
				},

				/**
				 * After call hook. You can modify the data.
				 * @param {Context} ctx 
				 * @param {Object} route 
				 * @param {IncomingRequest} req 
				 * @param {ServerResponse} res 
				 * @param {Object} data
				 * */

				// async onAfterCall(ctx, route, req, res, data) {
				// },

				// Calling options. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Calling-options
				callingOptions: {},

				bodyParsers: {
					json: {
						strict: false,
						limit: "1MB"
					},
					urlencoded: {
						extended: true,
						limit: "1MB"
					}
				},

				// Mapping policy setting. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Mapping-policy
				mappingPolicy: "all", // Available values: "all", "restrict"

				// Enable/disable logging
				logging: true
			}
		],

		// Do not log client side errors (does not log an error response when the error.code is 400<=X<500)
		log4XXResponses: false,
		// Logging the request parameters. Set to any log level to enable it. E.g. "info"
		logRequestParams: null,
		// Logging the response data. Set to any log level to enable it. E.g. "info"
		logResponseData: null,


		// Serve assets from "public" folder. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Serve-static-files
		assets: {
			folder: "public",

			cors: {
				// Configures the Access-Control-Allow-Origin CORS header.
				origin: [process.env.CORS],
				// Configures the Access-Control-Allow-Methods CORS header.
				methods: ["GET", "OPTIONS", "POST", "PUT", "DELETE"],
				// Configures the Access-Control-Allow-Headers CORS header.
				allowedHeaders: ["*"],
				// Configures the Access-Control-Expose-Headers CORS header.
				exposedHeaders: ["*"],
				credentials: true,
			},

			// Options to `server-static` module
			options: {}
		},

		//  Global error handler //TODO: catch all error
		onError(req, res, err) {
			// console.log("=============================");
			// console.log(res);
			console.log(err);
			// console.log("=============================");

			if (err.code) {
				if (err.code == 401 || err.code == 403) {
					res.writeHead(err.code, { "Content-Type": "application/json" });
					res.end(JSON.stringify(err));
				}
				else {
					res.writeHead(err.code, { "Content-Type": "application/json" });
					res.end(JSON.stringify(err));
				}
			} else {
				res.writeHead(501, { "Content-Type": "text/plain" });
				res.end("Hệ thống đang bận: " + err.message);
			}
		}
	},

	methods: {
		async authenticate(ctx, route, req) {
			let token = ctx.meta.reqHeaders.token;
			if (token == null || token == '')
				return Promise.reject(new MoleculerError('Token bắt buộc phải gửi kèm khi dùng tính năng này', 403, 'TOKEN_ERR', { 'message': "Token bắt buộc phải gửi kèm khi dùng tính năng này" }));
			else {
				try {
					let result = await tokenManager.verifyToken(token);
					if (result == 'valid') {
						let userID = tokenManager.decodeToken(token).userID
						let savedUserInCachce = await cacher.get(this.adapter, this.broker, userID);
						// console.log('savedUserInCachce', savedUserInCachce)

						if (savedUserInCachce) {
							let check = false;
							for (let i = 0; i < savedUserInCachce.length; ++i) {
								// console.log(savedUserInCachce[i].token);
								if (token == savedUserInCachce[i].token) {
									check = true; break;
								}
							}
							//user already logged in 
							if (check) {
								ctx.meta.user = userID
								return Promise.resolve(ctx);
							}
							else
								return Promise.reject(new MoleculerError("Token đã bị quá hạn", 403, 'TOKEN_ERR', { 'message': "Token đã bị quá hạn" }))
						}
						else {
							return Promise.reject(new MoleculerError("Không có thông tin login của user", 403, 'TOKEN_ERR', { 'message': "Không có thông tin login của user" }));
						}
					}
				}
				catch (error) {
					console.log('Lỗi', error)
					if (error == 'invalid')
						return Promise.reject(new MoleculerError("Token không chính xác", 403, 'TOKEN_ERR', { 'message': "Token không chính xác" }))
					else if (error == 'expired')
						return Promise.reject(new MoleculerError("Token đã bị quá hạn", 403, 'TOKEN_ERR', { 'message': "Token đã bị quá hạn" }))
				}
			}

		},
		async authorize(ctx, route, req) {
			if (ctx.meta.endpoint == '/authen/login')
				return null
			else {
				console.log(ctx.meta.endpoint)
				let token = ctx.meta.reqHeaders.token;
				let userID = tokenManager.decodeToken(token).userID
				let savedUserInCachce = await cacher.get(this.adapter, this.broker, userID);
				if (savedUserInCachce) {
					let latest = savedUserInCachce.length - 1
					let hasPermission = false
					for (let i = 0; i < savedUserInCachce[latest].role_permission.length; ++i) {
						// if (savedUserInCachce.role_permission[i].API == ctx.meta.endpoint) {
						// 	hasPermission = true; break;
						// }
						if (ctx.meta.endpoint.includes(savedUserInCachce[latest].role_permission[i].API)) {
							hasPermission = true; break;
						}
					}
					if (hasPermission) {
						console.log('Has Permission', hasPermission)
						return null
					}
					else {
						return Promise.reject(new MoleculerError("User không có quyền với api này", 401, 'UNAUTHORIZED_ERR', { 'message': "User không có quyền với api này" }))
					}
				}
				else {
					return Promise.reject(new MoleculerError("Không có thông tin login của user", 403, 'TOKEN_ERR', { 'message': "Không có thông tin login của user" }))
				}
			}
		},
		async checkCCIDandFindServer(ccid, token) {

			let userHasPermissionToThisCamera = false;
			let userID = tokenManager.decodeToken(token).userID

			//Kiểm tra quyền truy cập cam kiểu cũ - theo hướng kiểm tra có phân quyền role-permission
			// let savedUserInCachce = await cacher.get(this.adapter, this.broker, userID);
			
			// let latest = savedUserInCachce.length - 1

			// for (let i = 0; i < savedUserInCachce[latest].role_permission.length; ++i) {
			// 	if (savedUserInCachce[latest].role_permission[i].CameraID == ccid) {
			// 		userHasPermissionToThisCamera = true; break;
			// 	}
			// }

			//Kiểm tra quyền truy cập cam kiểu mới - chỉ kiểm tra nếu cam này thuộc org từ cấp của user trở xuống là có quyền
			let check = await this.adapter.db.query(`CALL checkif_cam_belongs_to_user_org_and_children_org('${userID}','${ccid}')`)
			check.map((row) => { userHasPermissionToThisCamera = row.result });
			console.log('userHasPermissionToThisCamera ', userHasPermissionToThisCamera)
			let result = {
				message:'',
				data:null
			};
			if (userHasPermissionToThisCamera) {
				let serverList = await cacher.get(this.adapter, this.broker, 'serverList');
				// console.log(serverList)
				for (let i = 0; i < serverList.length; ++i) {
					// console.log(serverList[i]);
					if (serverList[i].CameraList != null && serverList[i].CameraList.length > 0) {
						let check = serverList[i].CameraList.some(function (el) {
							return el.CameraID === ccid;
						});
						if (check) {
							result.data = serverList[i];
							break;
						}
					}
				}
				if (result.data == null)
				result.message = 'Không tìm thấy server tương ứng với ccid này.'
			}
			else
			{
				result.message = 'User không có quyền truy xuất với ccid này.'
			}
			if(result.data!=null) return Promise.resolve(result.data);
			else return Promise.reject(result.message);
		},
		async findServerOnly(serverID) {
			let result = null;
			let serverList = await cacher.get(this.adapter, this.broker, 'serverList');
			// console.log(serverList)
			for (let i = 0; i < serverList.length; ++i) {
				if (serverList[i].ServerID == serverID) {
					result = serverList[i];
					break;
				}
			}
			if (result == null)
				console.log('Không tìm thấy server này')
			return Promise.resolve(result);
		},
		isObjectEmpty(obj) {
			// console.log('obj', obj)
			for (var prop in obj) {
				if (obj.hasOwnProperty(prop))
					return false;
			}

			return true;
		},
	},

	async started() {
		console.log('api gateway started');
		//call DB to get list of apis that need to be proxied
			this.adapter.db.query(`SELECT * FROM ApiProxy`)
			.then((res) => {
				//Bị return duplicate --> get index 0
				cacher.set(this.adapter, this.broker, 'apiListProxy', res[0]);
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

	},

};
