const { mockClient } = require('aws-sdk-client-mock');
const { Signer } = require("../app/modules/aws/Signer");

const s3ClientMock = mockClient(s3Client);


describe('Signer', () => {
    
    it('should getAuthToken', async () => {
        const configuration = {
            region: 'us-west-2',
            credentials: {
              accessKeyId: 'FAKE_ACCESS_KEY_ID',
              secretAccessKey: 'FAKE_SECRET_ACCESS_KEY'
            },
            username: 'test-user',
            expiresIn: 3600,
            sha256: require('crypto-js/sha256') // Example, you can use any sha256 implementation
          };
          
        const signer = new Signer(configuration);
    })

    it('should create credentials', async () => {
        const configuration = {
            region: 'us-west-2',
            credentials: {
              accessKeyId: 'FAKE_ACCESS_KEY_ID',
              secretAccessKey: 'FAKE_SECRET_ACCESS_KEY'
            },
            username: 'test-user',
            expiresIn: 3600,
            sha256: require('crypto-js/sha256') // Example, you can use any sha256 implementation
          };
          
        const signer = new Signer(configuration);
    })
});