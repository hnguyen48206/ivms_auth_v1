
module.exports = {
	/**
	 * Private properties
	 */
    _active: 'local',
    _disks: {
		local: {
            root: process.cwd(),
            maxDiskPercentStorage: 70
		},
		s3: {
			driver: 's3',
			config: {
				key: 'AWS_S3_KEY',
				secret: 'AWS_S3_SECRET',
				region: 'AWS_S3_REGION',
				bucket: 'AWS_S3_BUCKET',
			},
		},
		gcs: {
			driver: 'gcs',
			config: {
				keyFilename: 'GCS_KEY',
				bucket: 'GCS_BUCKET',
			},
		},
	},
	_currentMode: undefined,
	_manualDeleteQuantity: 1,
	/**
	 * ---------------------------
	 */

	/**
	 * Enumerate storing mode: AUTO | MANUAl
	 */
	mode: Object.freeze({
		AUTO: 0,
		MANUAL: 1
	}),

	/**
	 * @param {string} disk disk already added
	 */
	getDiskConfig: function(disk) {
		if (!(disk in this._disks)) {
			return undefined;
		} else {
			return this._disks[disk];
		}
	},
	/**
	 * @param {string} name 
	 * @param {object} config 
	 */
	addDiskConfig: function(name, config) {
		if (this._disks[name]) {
			throw new Error("Disk already exists");
		} else {
			this._disks[name] = config;
		}
	},

	/**
	 * @returns {object} all disks' configuration
	 */
	getAllDisksConfig: function() {
		return this._disks;
	},


	getCurrentMode: function() {
		return !this._currentMode ? this.mode.AUTO : this._currentMode;
	},

	/**
	 * 
	 * @param {enum mode} mode 
	 */
	setCurrentMode: function(mode) {
		if (!mode instanceof mode) {
			throw new Error("Mode doesn't exist");
		} else {
			this._currentMode = mode;
		}
	},

	/**
	 * @returns name of active disk
	 */
	getActiveDisk: function() {
		return this._active;
	},
	/**
	 * @param {string} disk 
	 * @description set @param disk to active disk
	 */
	setActiveDisk: function(disk) {
		if (!(disk in this._disks)) {
			throw new Error("Disk doesn't exist");
		} else {
			this._active = disk;
		}
	},



}