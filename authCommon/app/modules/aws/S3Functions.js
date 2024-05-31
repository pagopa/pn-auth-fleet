// Create a service client module using ES6 syntax.
const { GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client } = require('./Clients');

async function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
}

async function getObjectAsByteArray(bucketName, key){
    const input = {
        Bucket: bucketName,
        Key: key
    }
    const command = new GetObjectCommand(input)
    const data = await s3Client.send(command);
    console.log(data)
    const byteArray = await streamToBuffer(data.Body);

    return Buffer.from(byteArray, "binary");
}

async function putObject(input){
    console.log(s3Client)
    console.log(input)
    const putObjectCommand = new PutObjectCommand(input)
    await s3Client.send(putObjectCommand)
}

// Create the s3 client.
module.exports = {
    getObjectAsByteArray,
    putObject
};
