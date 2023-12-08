var osu = require('node-os-utils');
// var storageConfig = require('./storage-config');
var fs = require('fs');
var child_process = require('child_process');

/**
 * Storage Type supported: local, s3, gcs
 */
module.exports = {
    /**
     * Private properties
     */

    _storageDrive: {},
    _storageRam: {},
    _storageCpu: {},

    _broker: undefined, //init in initialiseAsync()
    _systemDb: undefined, //init in initialiseAsync()
    _storageConfig: undefined, //init in initialiseAsync()
    /**
     * ------------------------
     */

    /**
     * This function should be called initially to retrieve drive for
     * each storage listed in config
     */
    registerStorage: async function (storageConfig, dB) {
        let oos = await osu.os.oos();
        console.log(`Your application is running on ${oos}`);
        this._storageConfig = storageConfig;
        this._systemDb = dB;
        for (let disk in this._storageConfig.getAllDisksConfig()) {
            switch (disk) {
                case 'local':
                    this._storageDrive['local'] = osu.drive;
                    this._storageRam['local'] = osu.mem;
                    this._storageCpu['local'] = osu.cpu;
                    break;
                //other case
            }
        }
    },

    /**
     * @returns whether the ratio of used space and max space exceeds limit listed in config
     */
    isDiskFull: async function () {
        try {
            let diskStatus = await this._checkDiskStorage();
            return ((diskStatus.used / diskStatus.max).toFixed(2)) * 100 >= this._storageConfig.getDiskConfig(this._storageConfig.getActiveDisk()).maxDiskPercentStorage;
        } catch (err) {
            throw new Error(err.message);
        }
    },

    /**
     * @returns information about used space, free space and max space of active disk
     */
    getDiskStorage: async function () {
        let result = {
            total: undefined,
            used: undefined,
            percentage: undefined
        }
        try {
            result = await this._getDiskStorage();
        } catch (err) {
            throw new Error(err.message);
        }
        return result;
    },

    /**
     * @returns information about used space, free space and max space of storage path in active disk
     */
    getDirStorage: async function (dirPath) {
        let result = {
            total: undefined,
            used: undefined,
            percentage: undefined
        }
        try {
            result = await this._getDirStorage(dirPath);
        } catch (err) {
            throw new Error(err.message);
        }
        return result;
    },

    /**
     * @returns information about used space, free space and max space of ram and disk storage path in active disk
     */
    getSystemInfo: async function (dirPath) {
        let result = {
            diskTotal: undefined,
            diskUsed: undefined,
            diskPercentage: undefined,
            ramTotal: undefined,
            ramUsed: undefined,
            ramPercentage: undefined,
            cpuNumber: undefined,
            cpuPercentage: undefined
        }
        try {
            result = await this._systemDb.find({
                sort: { $natural: -1 },
                limit: 1
            });
            return result[0];
        } catch (err) {
            throw new Error(err.message);
        }
        return result;
    },

    /**
     * @returns information about used space, free space and max space of ram and disk storage path in active disk
     */
    getSystemInfoDirect: async function (dirPath) {
        let result = {
            diskTotal: undefined,
            diskUsed: undefined,
            diskPercentage: undefined,
            ramTotal: undefined,
            ramUsed: undefined,
            ramPercentage: undefined,
            cpuNumber: undefined,
            cpuPercentage: undefined
        }
        try {
            let diskStorage = await this._getDiskStorage();
            let ramStorage = await this._getRamStorage();
            let cpuInfo = await this._getCpuInfo();
            result.diskTotal = diskStorage.total;
            result.diskUsed = diskStorage.used;
            result.diskPercentage = diskStorage.percentage;
            result.ramTotal = ramStorage.total;
            result.ramUsed = ramStorage.used;
            result.ramPercentage = ramStorage.percentage;
            result.cpuNumber = cpuInfo.number;
            result.cpuPercentage = cpuInfo.percentage;
        } catch (err) {
            throw new Error(err.message);
        }
        return result;
    },

    /**
     * @returns information about used space, free space and max space of ram and disk storage path in active disk
     */
    addSystemInfo: async function () {
        try {
            let diskStorage = await this._getDiskStorage();
            let ramStorage = await this._getRamStorage();
            let cpuInfo = await this._getCpuInfo();

            let result = await this._systemDb.insert({
                diskTotal: diskStorage.total,
                diskUsed: diskStorage.used,
                diskPercentage: diskStorage.percentage,
                ramTotal: ramStorage.total,
                ramUsed: ramStorage.used,
                ramPercentage: ramStorage.percentage,
                cpuNumber: cpuInfo.number,
                cpuPercentage: cpuInfo.percentage,
                created_time: Date.now()
            });

            return result;

        } catch (err) {
            throw new Error(err.message);
        }
        return result;
    },

    /**
     * @returns information about used space, free space and max space of ram and disk storage path in active disk
     */
    clearSystemInfo: async function () {
        try {
            // clear 2 days past. (86400 seconds x 2 days x 1000 miliseconds = 172800000 miliseconds)
            let result = await this._systemDb.remove({
                created_time: { $lt: (Date.now() - 172800000) }
            });

            return result;

        } catch (err) {
            throw new Error(err.message);
        }
        return result;
    },

    /**
     * @returns information about used space, free space and max space of ram and disk storage path in active disk
     */
    getDiskInfo: async function (dirPath) {
        let result = {
            diskTotal: undefined,
            diskUsed: undefined,
            diskPercentage: undefined,
            ramTotal: undefined,
            ramUsed: undefined,
            ramPercentage: undefined,
        }
        try {
            let diskStorage = await this._getDiskStorage();
            let ramStorage = await this._getRamStorage();
            result.diskTotal = diskStorage.total;
            result.diskUsed = diskStorage.used;
            result.diskPercentage = diskStorage.percentage;
            result.ramTotal = ramStorage.total;
            result.ramUsed = ramStorage.used;
            result.ramPercentage = ramStorage.percentage;
        } catch (err) {
            throw new Error(err.message);
        }
        return result;
    },

    isRamFull: function () {

    },

    /**
     * Private methods
     */
    _checkDiskStorage: async function () {
        let result = {
            max: undefined,
            used: undefined,
            free: undefined
        }
        switch (this._storageConfig.getActiveDisk()) {
            case 'local':
                try {
                    let info = await this._storageDrive['local'].info();
                    result.max = info.totalGb;
                    result.used = info.usedGb;
                    result.free = info.freeGb;
                } catch (err) {
                    throw new Error("Can't check disk storage: " + err.message);
                }
                break;
        }
        return result;
    },

    _getDiskStorage: async function () {
        let result = {
            total: undefined,
            used: undefined,
            percentage: undefined
        }
        switch (this._storageConfig.getActiveDisk()) {
            case 'local':
                try {
                    let info = await this._storageDrive['local'].info();
                    result.total = (parseInt(info.totalGb) * 1073741824).toString();
                    result.used = (parseInt(info.usedGb) * 1073741824).toString();
                    result.percentage = parseFloat(info.usedPercentage).toFixed(1);
                    // result.percentage = ((info.usedGb / info.totalGb).toFixed(2)) * 100;
                } catch (err) {
                    throw new Error("Can't check disk storage: " + err.message);
                }
                break;
        }
        return result;
    },

    _getDirStorage: async function (dirPath) {
        let result = {
            total: undefined,
            used: undefined,
            percentage: undefined
        }
        try {
            let command = `du -sb ${dirPath}`;
            let cp = child_process.execSync(command);
            console.log(cp.toString());
            let output = cp.toString().split("	");
            result.used = output[0].toString();

            let info = await this._getDiskStorage();
            result.total = info.total;
            result.percentage = (((output[0] / info.total).toFixed(1)) * 100).toString();

        } catch (err) {
            throw new Error("Can't check dir storage: " + err.message);
        }
        return result;
    },

    _getRamStorage: async function () {
        let result = {
            total: undefined,
            used: undefined,
            percentage: undefined
        }
        switch (this._storageConfig.getActiveDisk()) {
            case 'local':
                try {
                    let info = await this._storageRam['local'].info();
                    result.total = (parseInt(info.totalMemMb) * 1048576).toString();
                    result.used = (parseInt(info.usedMemMb) * 1048576).toString();
                    result.percentage = (100 - parseFloat(info.freeMemPercentage).toFixed(1)).toString();
                    // result.percentage = ((info.usedMemMb / info.totalMemMb).toFixed(2)) * 100;
                } catch (err) {
                    throw new Error("Can't check ram storage: " + err.message);
                }
                break;
        }
        return result;
    },

    _checkRamStorage: function () {

    },

    _getCpuInfo: async function () {
        let result = {
            number: undefined,
            percentage: undefined
        }
        switch (this._storageConfig.getActiveDisk()) {
            case 'local':
                try {
                    let cpu = await this._storageCpu['local'];
                    result.number = cpu.count().toString();

                    result.percentage = await cpu.usage()
                        .then(cpuPercentage => {
                            console.log(cpuPercentage);
                            return cpuPercentage.toString();
                        });
                } catch (err) {
                    throw new Error("Can't check cpu info: " + err.message);
                }
                break;
        }
        return result;
    },

    /**
     * -------------------------
     */
}