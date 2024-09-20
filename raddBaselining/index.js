const { eventHandler } = require("./src/app/eventHandler.js");

async function handler(event) {
  console.info("New event received ", event);
  return eventHandler(event);
}

exports.handler = handler;
