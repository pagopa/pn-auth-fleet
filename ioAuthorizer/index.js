const { handleEvent } = require("./src/app/eventHandler.js");

const handler = async (event) => {
  // commented to hide PII
  // console.info("New event received ", event);
  return handleEvent(event);
};

exports.handler = handler;
