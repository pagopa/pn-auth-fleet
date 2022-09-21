const axios = require ('axios');
const retrieverJwks = require('../app/retrieverJwks.js');
const MockAdapter = require('axios-mock-adapter');
const fs = require("fs");


describe('retrieverJwks success', () => {
    const result = fs.readFileSync("./src/test/jwks-mock/spid-hub-test.dev.pn.pagopa.it.jwks.json", { encoding: "utf8" });
    const jsonResult = JSON.parse(result);
    const mock = new MockAdapter(axios);
    mock.onGet("https://spid-hub-test.dev.pn.pagopa.it:8080/.well-known/jwks.json").reply(200, jsonResult);
    
    retrieverJwks.getJwks("https://spid-hub-test.dev.pn.pagopa.it:8080").then(function (response) {
        console.log(response);
    });
});

describe('retrieverJwks error', () => {
    fs.readFileSync("./src/test/jwks-mock/spid-hub-test.dev.pn.pagopa.it.jwks.json", { encoding: "utf8" });
    const mock = new MockAdapter(axios);
    mock.onGet("https://spid-hub-test.dev.pn.pagopa.it:8080/.well-known/jwks.json").reply(500);
    
    retrieverJwks.getJwks("https://spid-hub-test.dev.pn.pagopa.it:8080").then(function (response) {
        console.log(response);
    });
});