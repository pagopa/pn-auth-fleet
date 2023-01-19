import { handleEvent } from './src/app/eventHandler.js';

export const handler = async (event) => {
    console.info("New event received ", event);
    return handleEvent(event);
};
