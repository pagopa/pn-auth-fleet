const index = require('../index')
const fs = require('fs')
const AWSXRay = require('aws-xray-sdk-core')
AWSXRay.setContextMissingStrategy('LOG_ERROR')

/*
test('Runs function handler', async () => {
    let eventFile = fs.readFileSync('event.json')
    let event = JSON.parse(eventFile)
    let response = await index.handler(event, null)
    expect(response.policyDocument.Statement[0].Effect).toBe('Allow')
  }
)*/

test();

//TODO I test sono da rifare

async function test () {
  let eventFile = fs.readFileSync('event.json')
  let event = JSON.parse(eventFile)
  let response = await index.handler(event, null)
  console.log('response ', response);  
}

