const expect = require("chai").expect;
const lambdaTester = require("lambda-tester");
const proxyquire = require("proxyquire");
const jsonwebtoken = require('jsonwebtoken');
const fs = require("fs");

var ValidationException = require('../app/exception/validationException.js');

const publicKeyGetterMock = {
    getJwks: async function (issuer) {
      return fs.readFileSync("./src/test/jwks-mock/" + issuer + ".jwks.json", { encoding: "utf8" });
    }
};

const validator = proxyquire.noCallThru().load("../app/validation.js", {
    "./publicKeyGetter.js": publicKeyGetterMock,
    "jsonwebtoken": jsonwebtoken,
    "./exception/validationException.js": ValidationException,
});

const AWS = require('aws-sdk-mock');
AWS.mock('KMS', 'sign', function (params, callback) {
    callback(null, {Signature:'signature'});
});

const tokenGen = require('../app/tokenGen.js')

const eventHandler = proxyquire.noCallThru().load("../app/eventHandler.js", {
    "./validation.js": validator,
    "./tokenGen.js": tokenGen,
    "./exception/validationException.js": ValidationException,
});

const lambda = proxyquire.noCallThru().load("../../index.js", {
    "./src/app/eventHandler.js": eventHandler,
});

describe("Expired token from SC", function () {
    
    const expiredToken = {
        headers:{
            origin: 'https://portale-pa-develop.fe.dev.pn.pagopa.it'
        },
        queryStringParameters:{
            authorizationToken: 'eyJraWQiOiJqd3QtZXhjaGFuZ2VfZDQ6ZWY6NjQ6NzY6YWY6MjI6MWY6NDg6MTA6MDM6ZTQ6NjE6NmU6Y2M6Nzk6MmYiLCJhbGciOiJSUzI1NiJ9.eyJlbWFpbCI6InJhb3VsODdAbGliZXJvLml0IiwiZmFtaWx5X25hbWUiOiJHYWxsaSIsImZpc2NhbF9udW1iZXIiOiJHTExNUkE3N000M0EzMzJPIiwibmFtZSI6Ik1hdXJvIiwiZnJvbV9hYSI6ZmFsc2UsInVpZCI6IjEyZTNjNWE4LTA2NWItNDExZi1hMzY0LWYxOGQ2NjI0MmU0ZiIsImxldmVsIjoiTDIiLCJpYXQiOjE2NDUwODk3MjQsImV4cCI6MTY0NTA4OTczOSwiaXNzIjoiYXBpLnNlbGZjYXJlLnBhZ29wYS5pdCIsImp0aSI6IjRkODM4NDJiLWM4ODAtNDEyYy05ZDkwLWY1NzhkNzQwODVkYSIsImF1ZCI6InBvcnRhbGUtcGEtZGV2ZWxvcC5mZS5kZXYucG4ucGFnb3BhLml0Iiwib3JnYW5pemF0aW9uIjp7ImlkIjoiY19iOTYzIiwicm9sZSI6InJlZmVyZW50ZSBvcGVyYXRpdm8iLCJmaXNjYWxfY29kZSI6IjgwMDAyMjEwNjE3In0sImRlc2lyZWRfZXhwIjoxNjQ1MDkzMjI1fQ.1GV2b6RKRyF6beUhmKcDEqXpmGBaINMKF2TLQSB64rehvWPONi9y71WUpZggncGF_GGzOFen7SorgnnUQRN0MXlxotb4HBs5uSpGcvqUYKUiZ0a_5w9iYl0Sr6iXG1nH3sW0GqgE_ySYcw5Hl1lYHwA2-wE3ClILo5JZk6fyhNru0jXt0TM9mAsPYoQg0f5joSFxsHQ6aVzx6DMFnbFbt4hPwRUqLR8y79r3uDYby2mBNA_BhfaTwGPbETryqZI0YJRaZiQYECKONPYjMGoSC57gHbD53XWBPpR_D8QS6rPEX2ag-5IuUjQz6t_BtikKMIB89_r95_5lzEADKHrVnw'    
        }
    }
    
    it("with code = 400", function (done) {        
        lambdaTester( lambda.handler )
        .event( expiredToken )
        .expectResult((result) => {
            // Check if code exist
            console.debug('the result is ', result);    
            expect(result.statusCode).to.equal(400);
            const body = JSON.parse(result.body);
            expect(body.error).to.exist;
            done();
        }).catch(done); // Catch assertion errors
    });
});

describe("Invalid Audience from spidhub", function () {
    
    const expiredToken = {
        headers:{
            origin: 'https://portale-pf-develop.fe.dev.pn.pagopa.it'
        },
        queryStringParameters:{
            authorizationToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY0NTA4OTQyMiwiZXhwIjoxNjQ1MDkzMDIyLCJpc3MiOiJzcGlkaHViLXRlc3QuZGV2LnBuLnBhZ29wYS5pdCIsImp0aSI6IjAxRlczRkdaSFBTVzJYWjQxODlNRks2NFhCIn0.tOymeT30jdQEDTYZdodJeRusAuwmigy4uNupnYOoFg9fb1mNGPsqR8mKjl1sTYgEgrMaO8ItUeIMjXd4jnYk_djbB8ZqK-Dpooa0Wfr__rCXY8zl2mUjIvAbUsadSKEcjyFJbLYWCdOInvPezY58qhpkN2ZCiue7t77hzROIFjx5dkC4DIZHcS3MmdWrK2Ufe4P-uc7hpmHYX1kqW2MpIJLBd5-iJKU8-dGRGJ6mm2bwGhQgwwsuwmk09BtFOH9uqHvl0IpQDkOkBcfoCuzPzbzOAPlxwVPaJNv3rMC4-9yjlgaS6vZX3K-gkpia2atyjoB_lptPmz_33OLF3-rvQw'    
        }
    }
    
    it("with code = 400", function (done) {        
        lambdaTester( lambda.handler )
        .event( expiredToken )
        .expectResult((result) => {
            // Check if code exist
            console.debug('the result is ', result);    
            expect(result.statusCode).to.equal(400);
            const body = JSON.parse(result.body);
            expect(body.error).to.exist;
            done();
        }).catch(done); // Catch assertion errors
    });
});

describe("Invalid Issuer", function () {
    
    const invalidToken = {
        headers:{
            origin: 'https://portale-pa-develop.fe.dev.pn.pagopa.it'
        },
        queryStringParameters:{
            authorizationToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY0OTY4Njc0OSwiZXhwIjoxNjQ5NjkwMzQ5LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMENGVzgwSEdUVFcwUkg1NFdRRDZGNlMifQ.CRd7N1ceNzb-oh3Xk8uffUjS6PHKcO8-zf9WOOvVH8C4tH-8m92wTH02j1dH5Q3pObBbmiU-EE6-ClDycuoRqNgk1aj4O9HHzSVHMKVlHeSsfPyHtmEC9sr817poooCkYZ9FZ-3bVnzzrXtmlA_KiwA49zpJoJ-QnZmblJVm0e3tt0RQHfPxekgjQOmd_ZscidHIMQd1AsshJyM-SfuHQzpWRb9jixby264kf1TL8UtxfAe47ipOGqxA5Ds6R0PSk8gR3fcdSuolZOVwSlnR_Ojt3-vgTJEJ07GPywLMBQzIx1qKIDcRBtG_B1Xt5N0Zublcw_V92EZ957Y_XSLl5w'    
        }
    }
    
    it("with code = 400", function (done) {        
        lambdaTester( lambda.handler )
        .event( invalidToken )
        .expectResult((result) => {
            // Check if code exist
            console.debug('the result is ', result);    
            expect(result.statusCode).to.equal(400);
            const body = JSON.parse(result.body);
            expect(body.error).to.exist;
            done();
        }).catch(done); // Catch assertion errors
    });
});

describe("Invalid Origin", function () {
    
    const invalidOrigin = {
        headers:{
            origin: 'https://portale-fake-develop.fe.dev.pn.pagopa.it'
        },
        queryStringParameters:{
            authorizationToken: 'eyJraWQiOiJqd3QtZXhjaGFuZ2VfZDQ6ZWY6NjQ6NzY6YWY6MjI6MWY6NDg6MTA6MDM6ZTQ6NjE6NmU6Y2M6Nzk6MmYiLCJhbGciOiJSUzI1NiJ9.1eyJlbWFpbCI6InJhb3VsODdAbGliZXJvLml0IiwiZmFtaWx5X25hbWUiOiJHYWxsaSIsImZpc2NhbF9udW1iZXIiOiJHTExNUkE3N000M0EzMzJPIiwibmFtZSI6Ik1hdXJvIiwiZnJvbV9hYSI6ZmFsc2UsInVpZCI6IjEyZTNjNWE4LTA2NWItNDExZi1hMzY0LWYxOGQ2NjI0MmU0ZiIsImxldmVsIjoiTDIiLCJpYXQiOjE2NDM2NDMyNzcsImV4cCI6MTU4MDYzNzQ0OCwiaXNzIjoiYXBpLnNlbGZjYXJlLnBhZ29wYS5pdCIsImp0aSI6IjAyOTdjYTllLTRhZWMtNDRiMy04M2FkLTAwYWI5NGI0ZWU4NyIsImF1ZCI6Ind3dy5iZXRhLnBuLnBhZ29wYS5pdCIsIm9yZ2FuaXphdGlvbiI6eyJpZCI6ImNfaDI4MiIsInJvbGUiOiJyZWZlcmVudGUgYW1taW5pc3RyYXRpdm8iLCJmaXNjYWxfY29kZSI6IjAwMTAwNzAwNTc0In0sImRlc2lyZWRfZXhwIjoxNjQzNjQ2ODcwfQ.iswF_C9_41zMM3aohGfBX_7lHpACGAWKAYX-JEuQTmP44A-phPRNR2SGcsdcjHqTs3vIK2fk7TUnC5TI8KyWOyTKCBP5LsTSQusbPoc3UHwToAiLVCAztC6U7SN73DIVzigHssrir-Yn5tJLSkpU_RvoLVxM9PDIp6HqwKsGU4dDGzLmSBRgNk-zRTK_BCY47bInYXxCQRLu7qFW-vGteVFj1E7OEMCubKpgm7jG48q6BwdZHcy9PN8Tq6v3O2wKy28tQKvFMYdLrZR5KuKtRzJeRXn0PwhXfCW6N9e8PmbYT78o0cg2_y7wX85h-KqA57hbxWsNZY3LNVkztAbeVQ'    
        }
    }
    
    it("with code = 500", function (done) {        
        lambdaTester( lambda.handler )
        .event( invalidOrigin )
        .expectResult((result) => {
            // Check if code exist
            console.debug('the result is ', result);    
            expect(result.statusCode).to.equal(500);
            const body = JSON.parse(result.body);
            expect(body.error).to.exist;
            done();
        }).catch(done); // Catch assertion errors
    });
});

describe("Invalid Algorithm", function () {
    const invalidToken = {
        headers:{
            origin: 'https://portale-pa-develop.fe.dev.pn.pagopa.it'
        },
        queryStringParameters:{
            authorizationToken: 'eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY0OTY4Njc0OSwiZXhwIjoxNjQ5NjkwMzQ5LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMENGVzgwSEdUVFcwUkg1NFdRRDZGNlMifQ.CRd7N1ceNzb-oh3Xk8uffUjS6PHKcO8-zf9WOOvVH8C4tH-8m92wTH02j1dH5Q3pObBbmiU-EE6-ClDycuoRqNgk1aj4O9HHzSVHMKVlHeSsfPyHtmEC9sr817poooCkYZ9FZ-3bVnzzrXtmlA_KiwA49zpJoJ-QnZmblJVm0e3tt0RQHfPxekgjQOmd_ZscidHIMQd1AsshJyM-SfuHQzpWRb9jixby264kf1TL8UtxfAe47ipOGqxA5Ds6R0PSk8gR3fcdSuolZOVwSlnR_Ojt3-vgTJEJ07GPywLMBQzIx1qKIDcRBtG_B1Xt5N0Zublcw_V92EZ957Y_XSLl5w'    
        }
    }
    
    it("with code = 400", function (done) {        
        lambdaTester( lambda.handler )
        .event( invalidToken )
        .expectResult((result) => {
            // Check if code exist
            console.debug('the result is ', result);    
            expect(result.statusCode).to.equal(400);
            const body = JSON.parse(result.body);
            expect(body.error).to.exist;
            done();
        }).catch(done); // Catch assertion errors
    });
})
