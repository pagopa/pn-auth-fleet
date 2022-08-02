const AWSXRay = require('aws-xray-sdk-core');
const http = require('http');
const https = require('https');

AWSXRay.captureHTTPsGlobal(http);
AWSXRay.captureHTTPsGlobal(https);

const axios = require('axios');

module.exports = {
    async getJwks(issuer) {
        const issuersUrl = (process.env.JWKS_MAPPING) ? JSON.parse(process.env.JWKS_MAPPING) : {
            'api.selfcare.pagopa.it': 'https://uat.selfcare.pagopa.it/.well-known/jwks.json', //TODO vedi stato issue SELC-390
            'spidhub-test.dev.pn.pagopa.it':'https://spidhub-test.dev.pn.pagopa.it:9090/.well-known/jwks.json',
            'spid-hub-test.dev.pn.pagopa.it':'https://spid-hub-test.dev.pn.pagopa.it:8080/.well-known/jwks.json',
            'spid-hub-test.uat.pn.pagopa.it':'https://spid-hub-test.uat.pn.pagopa.it:8080/.well-known/jwks.json'
        }

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
