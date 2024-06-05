const { expect } = require("chai");
const { mockClient } = require('aws-sdk-client-mock');
const { SendMessageCommand } = require("@aws-sdk/client-sqs");
const { sqsClient } = require('../app/modules/aws/Clients'); 
const { sendMessage } = require('../app/modules/aws/SQSFunctions');

const sqsClientMock = mockClient(sqsClient);

describe('SQS Client', () => {
    
    it('should SendMessage', async () => {
        const queueUrl = "queueUrl"
        const uuid = "75442486-0878-440c-9db1-a7006c25a39f"
        const messageBody = {
            iss: "issuer",
            "requestTimestamp": new Date().toISOString(),
            "uuid": uuid
        }
        const delaySeconds = 0
        sqsClientMock.on(SendMessageCommand, { 
            QueueUrl: queueUrl, 
            MessageBody: JSON.stringify(messageBody),
            DelaySeconds: delaySeconds,
        }).resolves();
        try {
            await sendMessage(queueUrl, messageBody, delaySeconds);
        }
        catch (error) {
            console.log(error)
        }
    })
});