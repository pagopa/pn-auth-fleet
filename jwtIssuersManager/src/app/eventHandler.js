const { makeCommand } = require("./command");
const { validateBody } = require("./validator");

async function handleEvent(event) {
  // get lambda body
  const body = JSON.parse(event.body);

  const validationErrors = validateBody(body);

  if(validationErrors.length>0){
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Validation error", errors: validationErrors }),
    };
  }

  // create command by opType
  const command = makeCommand(body);

  // call command handler
  const res = await command.execute();
  
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Event handled" , response: res}),
  };
}

module.exports = { handleEvent };
