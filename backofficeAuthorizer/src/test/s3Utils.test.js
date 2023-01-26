const { mockClient } = require("aws-sdk-client-mock");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { expect } = require('chai');
const { getMethodTagsFromS3 } = require('../app/s3Utils');

const fs = require('fs');
const ddbMock = mockClient(S3Client);

describe('s3 tests', function() {
  this.beforeAll(() => {
    ddbMock.reset();
  })

  it("test tags extraction", async () => {
    const yamlDocument = fs.readFileSync('./src/test/mock.yaml');
    ddbMock.on(GetObjectCommand).resolves({
      Body: {
        transformToString: function(){
            return yamlDocument
        }
      }
    });

    const event = {
      path: '/aggregate',
      openApiPath: '/api-key-bo/aggregate',
      httpMethod: 'POST'
    }
    const bucket = 'buck'
    const key = 'key'
    const tags = await getMethodTagsFromS3(event, bucket, key);

    expect(tags).deep.equal([
        'Aggregate'
    ]);
  });

  it("test trigger ", async () => {
    ddbMock.on(GetObjectCommand).rejects(new Error('TEST ERROR'))

    const event = {
      path: '/aggregate',
      openApiPath: '/api-key-bo/aggregate',
      httpMethod: 'POST'
    }
    const bucket = 'buck'
    const key = 'key'
    try {
        const tags = await getMethodTagsFromS3(event, bucket, key);
    } catch(error){
        expect(error).to.not.be.null;
        expect(error).to.not.be.undefined;
        expect(error.message).to.equal('TEST ERROR');
    }

  });

})

