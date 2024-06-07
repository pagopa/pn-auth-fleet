const { Signer } = require("../app/modules/aws/Signer");
const { expect } = require("chai");
const { Hash } = require('@aws-sdk/hash-node');

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
            sha256: Hash.bind(null, 'sha256') // Example, you can use any sha256 implementation
          };
          
        const signer = new Signer(configuration);
        

        const authToken = await signer.getAuthToken();
        expect(authToken).to.be.a('string').that.is.not.empty;
        expect(authToken).to.include('FAKE_ACCESS_KEY_ID');

    })

});