const axios = require('axios');

module.exports = {
    async getJwks(issuer) {
        let jwksendpoint = issuersUrl[ issuer ];
        if( !jwksendpoint  ) {
            jwksendpoint = issuer + '/.well-known/jwks.json'
        }
        console.info('jwksendpoint is ', jwksendpoint);
        try {
            let response = await axios.get(jwksendpoint);
            return response.data;
        } catch(err){
            console.error('Error in get key ', err);
            throw new Error('Error in get pub key');
        }
    }
}