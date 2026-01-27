import { handleEvent  } from "./src/app/eventHandler.js";

async function handler(event) {
  // commented to hide PII
  // console.info("New event received ", event);
  return handleEvent(event);
}

export { handler };
