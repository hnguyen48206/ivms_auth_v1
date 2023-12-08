const axios = require('axios');
const DEV_URL = 'https://api.id2.tris.vn/';
const PROD_URL = 'https://api.id.dongthap.tris.vn/';
const Auth_key = 'vnpt-dongthap-2022';
module.exports = {
    async getUser(username) {
        let base_url = process.env.TRIS_PROD.toString() == '1' ? PROD_URL : DEV_URL;
        try {
            let result = await axios({
                url: base_url + 'api/ExternalUsers',
                headers: {
                },
                data:
                {
                    "authKey": Auth_key,
                    "userName": username
                },
                method: 'GET'
            })
            if (result) {
                console.log(result);
                return Promise.resolve({
                    isOK:true,
                    data: result.data.userId
                });
            }
        } catch (error) {
            console.log(error)
            return Promise.resolve({
                isOK:false,
                data: error
            });
        }
    },
    async createUser(username, password, email) {
        let base_url = process.env.TRIS_PROD.toString() == '1' ? PROD_URL : DEV_URL;
        try {
            let result = await axios({
                url: base_url + 'api/ExternalUsers',
                headers: {
                },
                data:
                {
                    "authKey": Auth_key,
                    "userName": username,
                    "password": password,
                    "email": email
                },
                method: 'POST'
            })
            if (result) {
                console.log(result);
                // return Promise.resolve(true);
                return Promise.resolve({
                    isOK:true,
                    data: result.data.userId
                });
            }
        } catch (error) {
            console.log(error)
            // return Promise.resolve(error);
            return Promise.resolve({
                isOK:false,
                data: error
            });
        }

    },
    async changePassword(username, password) {
        let base_url = process.env.TRIS_PROD.toString() == '1' ? PROD_URL : DEV_URL;
        try {
            let result = await axios({
                url: base_url + 'api/ExternalUsers/ChangePassword',
                headers: {
                },
                data:
                {
                    "authKey": Auth_key,
                    "userName": username,
                    "password": password
                },
                method: 'POST'
            })
            if (result) {
                console.log(result);
                
                return Promise.resolve(true);
            }
        } catch (error) {
            console.log(error)
            return Promise.resolve(error);
        }

    },
    async deleteUser(username) {
        let base_url = process.env.TRIS_PROD.toString() == '1' ? PROD_URL : DEV_URL;
        try {
            let result = await axios({
                url: base_url + 'api/ExternalUsers',
                headers: {
                },
                data:
                {
                    "authKey": Auth_key,
                    "userName": username
                },
                method: 'DELETE'
            })
            if (result) {
                console.log(result);
                return Promise.resolve(true);
            }
        } catch (error) {
            console.log(error)
            return Promise.resolve(error);
        }
    },
};