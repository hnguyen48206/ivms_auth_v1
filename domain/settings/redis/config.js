module.exports = {
    _host: '127.0.0.1',
    _port: '6379',

    get Port() {
        return this._port;
    },

    set Port(val) {
        this._port = val;
    }, 

    get Host() {
        return  this._host;
    },

    set Host(val) {
        this._host = val;
    }
}