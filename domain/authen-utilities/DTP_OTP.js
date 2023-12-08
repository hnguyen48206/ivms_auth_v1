const axios = require('axios');
module.exports = {
    async getToken() {
        let username = 'SB7abBNd2xJwho3rykJGCbsShKga';
        let password = '7dGTrc1GPBh2DX54FAW9GR5yhRUa';
        let result = await axios.post('https://lienthong.dongthap.gov.vn/token', new URLSearchParams({
            grant_type: 'client_credentials',
        }), {
            auth: {
                username: username,
                password: password
            }
        });
        if (result)
            return Promise.resolve(result.data.access_token);
        else
            return Promise.reject(false);
    },
    async sendOTP(token, phoneNumber) {
        try {
            let result = await axios({
                url: 'https://lienthong.dongthap.gov.vn/smsdt/1.0/SendSmsOtp',
                headers: {
                    'Authorization': 'Bearer ' + token
                },
                data: {
                    "sender": "camera_ioc_dongthap",
                    "receiver": phoneNumber,
                    "applicationTitle": "camera_ioc_dongthap"
                }
                ,
                method: 'POST'
            })
            if (result) {
                console.log(result);
                return Promise.resolve(true);
            }
            else
                return Promise.resolve(false);
        } catch (error) {
            return Promise.reject(error);
        }

    },
    async verifyOTP(token, phoneNumber, otp) {
        try {
            let result = await axios({
                url: 'https://lienthong.dongthap.gov.vn/smsdt/1.0/VerifyOpt',
                headers: {
                    'Authorization': 'Bearer ' + token
                },
                data: {
                    "sender": "camera_ioc_dongthap",
                    "receiver": phoneNumber,
                    "token": otp
                }
                ,
                method: 'POST'
            })
            console.log(result)
            if (result) {
                return Promise.resolve(result.data.data);
            }
            else
                return Promise.resolve(false);
        } catch (error) {
            return Promise.reject(error);
        }
    }
};