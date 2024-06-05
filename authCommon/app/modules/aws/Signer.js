const { SignatureV4 } = require('@aws-sdk/signature-v4');
const { formatUrl } = require('@aws-sdk/util-format-url');
const { getRuntimeConfig  } = require('../config/runtimeConfig');

/**
 * The signer class that generates an auth token to a database.
 */
class Signer {

  protocol = 'https:';
  service = 'elasticache';

  constructor(configuration) {
    this.configuration = getRuntimeConfig(configuration);
  }

  async getAuthToken() {
    
    console.log('conf', this.configuration)
    
    const signer = new SignatureV4({
      service: this.service,
      region: this.configuration.region,
      credentials: this.configuration.credentials,
      sha256: this.configuration.sha256,
    });

    const request = {
      method: 'GET',
      protocol: this.protocol,
      hostname: process.env.REDIS_SERVER_NAME,
      path: '/',
      query: {
        Action: 'connect',
        User: this.configuration.username, 
        ResourceType: 'ServerlessCache'
      },
      headers: {
        host: process.env.REDIS_SERVER_NAME,
      },
    };
    
    const presigned = await signer.presign(request, {
      expiresIn: this.configuration.expiresIn,
    });
    
    const format = formatUrl(presigned).replace(`${this.protocol}//`, '');
    return format;
  }
}

module.exports = {
  Signer
}