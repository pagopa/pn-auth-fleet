const workflowHandler = require('./src/app/eventHandler.js')

exports.handler = async (event) => {
    // commented to hide PII
    // console.info("New event received ", event);
    return workflowHandler.handleEvent(event);
};
