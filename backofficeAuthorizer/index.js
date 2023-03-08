const { handleEvent } = require('./src/app/eventHandler.js');

const handler = async (event) => {
    console.info("New event received ", event);
    return handleEvent(event);
};

module.exports = {
    handler
}