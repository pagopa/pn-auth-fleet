import { eventHandler } from "./src/app/eventHandler.js";
import { logEvent } from "./src/app/utils.js";

const handler = async (event) => {
  logEvent(event);
  return eventHandler(event);
};

export { handler };
