const workflowHandler = require('./src/app/eventHandler.js');
const utils = require("./src/app/utils.js");

exports.handler = async (event) => {
    utils.logEvent(event);
    return workflowHandler.eventHandler(event);
};
