const workflowHandler = require('./src/app/eventHandler.js')


exports.handler = async (event, context) => {
    console.info("New event received ", event);
    return workflowHandler.handleEvent(event);
};