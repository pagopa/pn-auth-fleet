// Create a service client module using ES6 syntax.
const { SendMessageCommand } = require("@aws-sdk/client-sqs");
const { sqsClient } = require('./Clients');

async function sendMessage(queueUrl, messageBody, delaySeconds){
    const input = { // SendMessageRequest
        QueueUrl: queueUrl, // required
        MessageBody: JSON.stringify(messageBody), // required
        DelaySeconds: delaySeconds,
    };
    const sendMessageCommand = new SendMessageCommand(input)
    await sqsClient.send(sendMessageCommand)
}

// Create the sqs client.
module.exports = {
    sendMessage
};
