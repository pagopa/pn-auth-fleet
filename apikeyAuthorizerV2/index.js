const { eventHandler } = require("./src/app/eventHandler.js");
const { logEvent } = require("./src/app/utils.js");

const handler = async (event) => {
  logEvent(event);
  return eventHandler(event);
};

exports.handler = handler;
