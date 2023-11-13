const { eventHandler } = require("./src/app/eventHandler.js");
const { logEvent } = require("./src/app/utils.js");

async function handler(event) {
  logEvent(event);
  return eventHandler(event);
}

exports.handler = handler;
