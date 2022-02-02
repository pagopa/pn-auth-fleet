const expect = require("chai").expect;
const lambdaTester = require("lambda-tester");
const proxyquire = require("proxyquire");
const fs = require('fs');
const jsonwebtoken = require('jsonwebtoken');
var ValidationException = require('../app/exception/validationException.js');

const publicKey = fs.readFileSync("./src/test/pkeytest.pem", { encoding: "utf8" });

const publicKeyGetterMock = {
    getPublicKey: async function (decodedToken, kid) {
      return publicKey
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

describe("Successful Invocation", function () {
    
    const workingToken = {
        queryStringParameters:{
            authorizationToken: 'eyJraWQiOiJqd3QtZXhjaGFuZ2VfZDQ6ZWY6NjQ6NzY6YWY6MjI6MWY6NDg6MTA6MDM6ZTQ6NjE6NmU6Y2M6Nzk6MmYiLCJhbGciOiJSUzI1NiJ9.eyJlbWFpbCI6InJhb3VsODdAbGliZXJvLml0IiwiZmFtaWx5X25hbWUiOiJHYWxsaSIsImZpc2NhbF9udW1iZXIiOiJHTExNUkE3N000M0EzMzJPIiwibmFtZSI6Ik1hdXJvIiwiZnJvbV9hYSI6ZmFsc2UsInVpZCI6IjEyZTNjNWE4LTA2NWItNDExZi1hMzY0LWYxOGQ2NjI0MmU0ZiIsImxldmVsIjoiTDIiLCJpYXQiOjE2NDM2NDMyNzcsImV4cCI6NDA3MzYyODgwMCwiaXNzIjoiYXBpLnNlbGZjYXJlLnBhZ29wYS5pdCIsImp0aSI6IjAyOTdjYTllLTRhZWMtNDRiMy04M2FkLTAwYWI5NGI0ZWU4NyIsImF1ZCI6Ind3dy5iZXRhLnBuLnBhZ29wYS5pdCIsIm9yZ2FuaXphdGlvbiI6eyJpZCI6ImNfaDI4MiIsInJvbGUiOiJyZWZlcmVudGUgYW1taW5pc3RyYXRpdm8iLCJmaXNjYWxfY29kZSI6IjAwMTAwNzAwNTc0In0sImRlc2lyZWRfZXhwIjoxNjQzNjQ2ODcwfQ.3sQwE8d9wNid_cipdIBP0ghn1gdOKvMVyEEsQugIuLYd7FXu0gLGpNEw3nk6Cc--dXXoWl6UWZzKBDOVkOmmNn92MEZksAEi2ftO9jktWZVxPridQ8GHkxT7ezhFGUQqxkd3wYZsNNsOF4fEvem_pGgUYaaN_fO3aKfa1CFNO-zlENO0NEzsg1yHAgaH7I-w7nGX-9ZYkUV85ws_TGELoj9zAOLzHT1yYF56J8q92oI63YfwBRJ4bUioH41wlIqwkEdxp2CjqOSHWdLoTGJbJeH3A3000yqysa5LqMcanMyqzzES3oazKAZRvYn84x1nBVsbxkQ0fhqCTnH0HDpzRQ'
        }
    }
    
    it("with code = 200", function (done) {        
        lambdaTester( lambda.handler )
        .event( workingToken )
        .expectResult((result) => {
            // Check if code exist
            console.debug('the result is ', result);    
            expect(result.statusCode).to.equal(200);
            expect(result.body.sessionToken).to.exist;
            done();
        }).catch(done); // Catch assertion errors
    });
});


describe("Expired token", function () {
    
    const expiredToken = {
        queryStringParameters:{
            authorizationToken: 'eyJraWQiOiJqd3QtZXhjaGFuZ2VfZDQ6ZWY6NjQ6NzY6YWY6MjI6MWY6NDg6MTA6MDM6ZTQ6NjE6NmU6Y2M6Nzk6MmYiLCJhbGciOiJSUzI1NiJ9.eyJlbWFpbCI6InJhb3VsODdAbGliZXJvLml0IiwiZmFtaWx5X25hbWUiOiJHYWxsaSIsImZpc2NhbF9udW1iZXIiOiJHTExNUkE3N000M0EzMzJPIiwibmFtZSI6Ik1hdXJvIiwiZnJvbV9hYSI6ZmFsc2UsInVpZCI6IjEyZTNjNWE4LTA2NWItNDExZi1hMzY0LWYxOGQ2NjI0MmU0ZiIsImxldmVsIjoiTDIiLCJpYXQiOjE2NDM2NDMyNzcsImV4cCI6MTU4MDYzNzQ0OCwiaXNzIjoiYXBpLnNlbGZjYXJlLnBhZ29wYS5pdCIsImp0aSI6IjAyOTdjYTllLTRhZWMtNDRiMy04M2FkLTAwYWI5NGI0ZWU4NyIsImF1ZCI6Ind3dy5iZXRhLnBuLnBhZ29wYS5pdCIsIm9yZ2FuaXphdGlvbiI6eyJpZCI6ImNfaDI4MiIsInJvbGUiOiJyZWZlcmVudGUgYW1taW5pc3RyYXRpdm8iLCJmaXNjYWxfY29kZSI6IjAwMTAwNzAwNTc0In0sImRlc2lyZWRfZXhwIjoxNjQzNjQ2ODcwfQ.iswF_C9_41zMM3aohGfBX_7lHpACGAWKAYX-JEuQTmP44A-phPRNR2SGcsdcjHqTs3vIK2fk7TUnC5TI8KyWOyTKCBP5LsTSQusbPoc3UHwToAiLVCAztC6U7SN73DIVzigHssrir-Yn5tJLSkpU_RvoLVxM9PDIp6HqwKsGU4dDGzLmSBRgNk-zRTK_BCY47bInYXxCQRLu7qFW-vGteVFj1E7OEMCubKpgm7jG48q6BwdZHcy9PN8Tq6v3O2wKy28tQKvFMYdLrZR5KuKtRzJeRXn0PwhXfCW6N9e8PmbYT78o0cg2_y7wX85h-KqA57hbxWsNZY3LNVkztAbeVQ'    
        }
    }
    
    it("with code = 200", function (done) {        
        lambdaTester( lambda.handler )
        .event( expiredToken )
        .expectResult((result) => {
            // Check if code exist
            console.debug('the result is ', result);    
            expect(result.statusCode).to.equal(400);
            expect(result.body.error).to.exist;
            done();
        }).catch(done); // Catch assertion errors
    });
});

describe("Invalid Signature", function () {
    
    const invalidToken = {
        queryStringParameters:{
            authorizationToken: 'eyJraWQiOiJqd3QtZXhjaGFuZ2VfZDQ6ZWY6NjQ6NzY6YWY6MjI6MWY6NDg6MTA6MDM6ZTQ6NjE6NmU6Y2M6Nzk6MmYiLCJhbGciOiJSUzI1NiJ9.1eyJlbWFpbCI6InJhb3VsODdAbGliZXJvLml0IiwiZmFtaWx5X25hbWUiOiJHYWxsaSIsImZpc2NhbF9udW1iZXIiOiJHTExNUkE3N000M0EzMzJPIiwibmFtZSI6Ik1hdXJvIiwiZnJvbV9hYSI6ZmFsc2UsInVpZCI6IjEyZTNjNWE4LTA2NWItNDExZi1hMzY0LWYxOGQ2NjI0MmU0ZiIsImxldmVsIjoiTDIiLCJpYXQiOjE2NDM2NDMyNzcsImV4cCI6MTU4MDYzNzQ0OCwiaXNzIjoiYXBpLnNlbGZjYXJlLnBhZ29wYS5pdCIsImp0aSI6IjAyOTdjYTllLTRhZWMtNDRiMy04M2FkLTAwYWI5NGI0ZWU4NyIsImF1ZCI6Ind3dy5iZXRhLnBuLnBhZ29wYS5pdCIsIm9yZ2FuaXphdGlvbiI6eyJpZCI6ImNfaDI4MiIsInJvbGUiOiJyZWZlcmVudGUgYW1taW5pc3RyYXRpdm8iLCJmaXNjYWxfY29kZSI6IjAwMTAwNzAwNTc0In0sImRlc2lyZWRfZXhwIjoxNjQzNjQ2ODcwfQ.iswF_C9_41zMM3aohGfBX_7lHpACGAWKAYX-JEuQTmP44A-phPRNR2SGcsdcjHqTs3vIK2fk7TUnC5TI8KyWOyTKCBP5LsTSQusbPoc3UHwToAiLVCAztC6U7SN73DIVzigHssrir-Yn5tJLSkpU_RvoLVxM9PDIp6HqwKsGU4dDGzLmSBRgNk-zRTK_BCY47bInYXxCQRLu7qFW-vGteVFj1E7OEMCubKpgm7jG48q6BwdZHcy9PN8Tq6v3O2wKy28tQKvFMYdLrZR5KuKtRzJeRXn0PwhXfCW6N9e8PmbYT78o0cg2_y7wX85h-KqA57hbxWsNZY3LNVkztAbeVQ'    
        }
    }
    
    it("with code = 200", function (done) {        
        lambdaTester( lambda.handler )
        .event( invalidToken )
        .expectResult((result) => {
            // Check if code exist
            console.debug('the result is ', result);    
            expect(result.statusCode).to.equal(400);
            expect(result.body.error).to.exist;
            done();
        }).catch(done); // Catch assertion errors
    });
});