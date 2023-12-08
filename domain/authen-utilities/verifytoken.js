const jwt = require("jsonwebtoken");
const jwtconfig = require('./jwtconfig.js');



module.exports = {
    verifyToken(token) {
        return new Promise((resolve,reject)=>{
            jwt.verify(token, jwtconfig.JWT_SECRET, function (err, decoded) {
                if (err) {
                    console.log(err.name);
                    if (err.name == 'TokenExpiredError')
                        reject('expired')
                    else
                        reject('invalid')
                }
                else
                    resolve('valid')
            });
        })
        
    },
    decodeToken(token) {
        return jwt.decode(token);
    },
    createToken(payload) {
        return jwt.sign(
            payload,
            jwtconfig.JWT_SECRET,
            {
                expiresIn: process.env.SESSION_EXP_TIME,
            })
    },

};