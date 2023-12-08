var ftp = require('basic-ftp');
var utils = require('../utils');

module.exports = {
    _ftpClient: undefined,

    registerClient: async function(host, port, user, password) {
        this._ftpClient = new ftp.Client(0);
        // this._ftpClient.ftp.verbose = true;
        try {
            let response = await this._ftpClient.access({
                host: host,
                port: port,
                user: user,
                password: password,
            });
            return response;
        } catch (err) {
            throw new Error(err.message);
        }
    },

    uploadFile: async function(localDir, fileName, cameraId) {
        if (this._ftpClient) {
            try {
                await this._ftpClient.cd('/');
            } catch (err) {
                throw new Error("Cannot go to /: " + err.message);
            }
            
            let remoteDir = utils.getRemoteDirOnDate(cameraId);

            try {
                await this._ftpClient.ensureDir(remoteDir);
            } catch (err) {
                throw new Error("Remote Dir doesn't exist");
            }
            
            try {
                await this._ftpClient.uploadFrom(`${localDir}/${fileName}`, `${fileName}`);
            } catch (err) {
                throw new Error("Upload file failed: " + err.message);
            }

        } else {
            throw new Error("Have to register ftp client first");
        }
    },

    close: async function() {
        if (this._ftpClient) {
            this._ftpClient.close();
        }
    }


}
