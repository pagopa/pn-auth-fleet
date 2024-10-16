const { expect } = require("chai");
const fs = require('fs');
const { mockClient } = require('aws-sdk-client-mock');
const { GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { Readable } = require('stream');
const { s3Client } = require('../app/modules/aws/Clients');
const { getObjectAsByteArray, putObject } = require('../app/modules/aws/S3Functions');

const s3ClientMock = mockClient(s3Client);

const getFilaAsByteArray = (fileName) => {
    return Buffer.from(fs.readFileSync(fileName, 'binary'));
}

describe('S3 Client', () => {
    beforeEach(() => {
        s3ClientMock.reset();
    });

    it('should getObjectAsByteArray', async () => {
        const response = getFilaAsByteArray('test/resources/jwks.json');
        const readableObj = Readable.from(response);
        s3ClientMock.on(GetObjectCommand, {
                Bucket: 'bucketname',
                Key: 'keyname'
            }
        ).resolves({
            Body: readableObj
        });

        const result = await getObjectAsByteArray('bucketname', 'keyname');
        expect(result).to.eql(response);
    })

    it('should putObject', async () => {
        const response = getFilaAsByteArray('test/resources/jwks.json')
        const readableObj = Readable.from(response)
        const input = {
            Bucket: 'bucket-name',
            Key: 'key-name',
            Body: Buffer.from(response)
        }
        s3ClientMock.on(PutObjectCommand).resolves({
            Body: readableObj
        });
        try {
            await putObject(input);
        } catch (error) {
            console.log("ERRORE", error)
            throw new Error("putObject threw an unexpected exception");
        }
    })

});