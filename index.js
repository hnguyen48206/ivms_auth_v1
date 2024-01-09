const { ServiceBroker } = require('moleculer');
const config = require('./moleculer.config');
config.hotReload = true;
require("dotenv").config();

const broker = new ServiceBroker(config);
broker.loadServices('services', '**/*.service.js');
broker.start();