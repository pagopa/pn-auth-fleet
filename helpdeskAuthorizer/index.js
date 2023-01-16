const eventHandler = require('./src/app/eventHandler.js');

exports.handler = async (event) => {
    console.info("New event received ", event);
    return eventHandler.handleEvent(event);
};
