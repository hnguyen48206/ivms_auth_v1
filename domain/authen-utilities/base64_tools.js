module.exports = {
    decode(input) {
        return Buffer.from(input, 'base64').toString('utf-8')
    },
    encode(input) {
        return Buffer.from(input).toString('base64')
    }
};