const {handleEvent} = require("./src/app/eventHandler.js");

async function handler(event) {
    console.info("Lollipop Bacckend Logger - new Request received");
    return handleEvent(event);
}

exports.handler=handler;