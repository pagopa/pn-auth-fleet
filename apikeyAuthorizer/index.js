import { handleEvent } from "./src/app/eventHandler.js";

const lambdaHandler = async (event) => {
  console.info("New event received ", event);
  return handleEvent(event);
};

export { lambdaHandler };
