const workflowHandler = require('./src/app/eventHandler.js');
const utils = require("./src/app/utils.js");

exports.handler = async (event) => {
    console.info("New event received ", utils.anonymizeEvent(event));
    return workflowHandler.eventHandler(event);
};
