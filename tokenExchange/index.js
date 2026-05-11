const { handleEvent } = require("./src/app/eventHandler.js");

async function handler(event, context) {
  console.info("New event received ", event);
  return handleEvent(event, context);
}

exports.handler = handler;
