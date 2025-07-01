const { handleEvent } = require("./src/app/eventHandler");

exports.handler = async (event, context) => {
  console.info("New event received ", event, context);
  return handleEvent(event);
}