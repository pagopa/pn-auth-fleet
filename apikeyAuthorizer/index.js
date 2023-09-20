import workflowHandler from "./src/app/eventHandler.js";

export const lambdaHandler = async (event) => {
  console.info("New event received ", event);
  return workflowHandler(event);
};
