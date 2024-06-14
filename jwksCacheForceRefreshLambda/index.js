const { handleEvent } = require("./src/app/eventHandler.js");

async function handler(event) {
  console.info("New event received ", event);
  return handleEvent(event);
}

exports.handler = handler;
