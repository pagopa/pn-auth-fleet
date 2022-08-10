const expect = require("chai").expect;
const lambdaTester = require("lambda-tester");
const proxyquire = require("proxyquire");
const jsonwebtoken = require('jsonwebtoken');
const fs = require("fs");
const sinon = require('sinon');
const rewire = require('rewire');
const tokenGen = rewire('../app/tokenGen');

const tokenGenObject = { getSignature: tokenGen.__get__('getSignature'), getKeyId: tokenGen.__get__('getKeyId') };
const stubGetSignature = sinon
  .stub(tokenGenObject, 'getSignature')
  .returns({Signature:'signature'});
tokenGen.__set__('getSignature', stubGetSignature);

const ValidationException = require('../app/exception/validationException.js');

const retrieverJwksMock = {
    getJwks: async function (issuer) {
        const result = fs.readFileSync("./src/test/jwks-mock/" + issuer.replace('https://','') + ".jwks.json", { encoding: "utf8" });
        return JSON.parse(result);
    }
};

const publicKeyGetter = proxyquire.noCallThru().load("../app/publicKeyGetter.js", {
    "./retrieverJwks.js": retrieverJwksMock
});

const validator = proxyquire.noCallThru().load("../app/validation.js", {
    "./publicKeyGetter.js": publicKeyGetter,
    "jsonwebtoken": jsonwebtoken,
    "./exception/validationException.js": ValidationException,
});

// PN-1129
// sign function mock breaks using X-Ray, probably due to non-compatible versions
// can't find the correct ones
// const AWS = require('aws-sdk-mock');
// AWS.mock('KMS', 'sign', function (_params, callback) {
//     callback(null, {Signature:'signature'});
// });

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
            authorizationToken: 'eyJraWQiOiJqd3QtZXhjaGFuZ2VfZDQ6ZWY6NjQ6NzY6YWY6MjI6MWY6NDg6MTA6MDM6ZTQ6NjE6NmU6Y2M6Nzk6MmYiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJlbWFpbCI6ImFhcm9uNzdAcG9zdGUuaXQiLCJmYW1pbHlfbmFtZSI6Ik1hbmNpbmkiLCJmaXNjYWxfbnVtYmVyIjoiTU5DQ1NEMDFSMTNBNzU3RyIsIm5hbWUiOiJDZXNpZGlhIiwiZnJvbV9hYSI6ZmFsc2UsInVpZCI6ImYwYmNkNDY4LWQ4NTMtNGM2NC1iZmIxLTNlNDdiNTI0NTVmMSIsImxldmVsIjoiTDIiLCJpYXQiOjE2NTk5NjU0NzcsImV4cCI6MTY1OTk2NTQ5MiwiYXVkIjoicG9ydGFsZS1wYS5jb2xsLnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vdWF0LnNlbGZjYXJlLnBhZ29wYS5pdCIsImp0aSI6ImY5NjY5ZDY2LTQ1YWItNDJkZC1iZGRiLTVlMGU0MzA3ZTNiNCIsIm9yZ2FuaXphdGlvbiI6eyJpZCI6IjAyNmU4YzcyLTc5NDQtNGRjZC04NjY4LWY1OTY0NDdmZWM2ZCIsInJvbGVzIjpbeyJwYXJ0eVJvbGUiOiJNQU5BR0VSIiwicm9sZSI6ImFkbWluIn1dLCJmaXNjYWxfY29kZSI6IjAxMTk5MjUwMTU4In0sImRlc2lyZWRfZXhwIjoxNjU5OTg2NzQ1fQ.myHzn15A7cUs1svFf3bM565sB0JUkd9c4Sz-67FJ7H4qImAPqOFC2dDcl0dVhY_PTJwtewinvllhTsEU0pDDLLWoAUW5Zf_UMsPo1u_Ct1_GZzDQuhthbeHZWxQJaNCmp2wgGBItHOiDSd1pm7YisKowcfgVWF_8czb_L5rnKO5WwN4G1ZqBU-7TqSMjixcoUA9uHKVO8Yj2e5cbJ_GSdgYW78y9UuLmLlI0GIylvZKSTDAkUDHnOOGD8hw4qQ5mJKZ3D_ntHO7GWW-IX_LJRL5SGYpW2ux3obNlJyHJgxHAZrDkhBIr__dFQ-qIVJUfGCj2ffu0LuoEVgjoWmvpbQ'
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
            authorizationToken: 'eyJraWQiOiJqd3QtZXhjaGFuZ2VfZDQ6ZWY6NjQ6NzY6YWY6MjI6MWY6NDg6MTA6MDM6ZTQ6NjE6NmU6Y2M6Nzk6MmYiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJlbWFpbCI6ImFhcm9uNzdAcG9zdGUuaXQiLCJmYW1pbHlfbmFtZSI6Ik1hbmNpbmkiLCJmaXNjYWxfbnVtYmVyIjoiTU5DQ1NEMDFSMTNBNzU3RyIsIm5hbWUiOiJDZXNpZGlhIiwiZnJvbV9hYSI6ZmFsc2UsInVpZCI6ImYwYmNkNDY4LWQ4NTMtNGM2NC1iZmIxLTNlNDdiNTI0NTVmMSIsImxldmVsIjoiTDIiLCJpYXQiOjE2NTk5NjU0NzcsImV4cCI6MTY1OTk2NTQ5MiwiYXVkIjoidG9ydGFsZS1wYS5jb2xsLnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vdWF0LnNlbGZjYXJlLnBhZ29wYS5pdCIsImp0aSI6ImY5NjY5ZDY2LTQ1YWItNDJkZC1iZGRiLTVlMGU0MzA3ZTNiNCIsIm9yZ2FuaXphdGlvbiI6eyJpZCI6IjAyNmU4YzcyLTc5NDQtNGRjZC04NjY4LWY1OTY0NDdmZWM2ZCIsInJvbGVzIjpbeyJwYXJ0eVJvbGUiOiJNQU5BR0VSIiwicm9sZSI6ImFkbWluIn1dLCJmaXNjYWxfY29kZSI6IjAxMTk5MjUwMTU4In0sImRlc2lyZWRfZXhwIjoxNjU5OTg2NzQ1fQ.myHzn15A7cUs1svFf3bM565sB0JUkd9c4Sz-67FJ7H4qImAPqOFC2dDcl0dVhY_PTJwtewinvllhTsEU0pDDLLWoAUW5Zf_UMsPo1u_Ct1_GZzDQuhthbeHZWxQJaNCmp2wgGBItHOiDSd1pm7YisKowcfgVWF_8czb_L5rnKO5WwN4G1ZqBU-7TqSMjixcoUA9uHKVO8Yj2e5cbJ_GSdgYW78y9UuLmLlI0GIylvZKSTDAkUDHnOOGD8hw4qQ5mJKZ3D_ntHO7GWW-IX_LJRL5SGYpW2ux3obNlJyHJgxHAZrDkhBIr__dFQ-qIVJUfGCj2ffu0LuoEVgjoWmvpbQ\n'
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
            expect(body).to.contain(/invalid audience/i)
            done();
        }).catch(done); // Catch assertion errors
    });
});

describe("Token from spidhub", function () {

    const expiredToken = {
        headers:{
            origin: 'https://portale-pf-develop.fe.dev.pn.pagopa.it'
        },
        queryStringParameters:{
            authorizationToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY0OTkyNDYyOCwiZXhwIjoxNjQ5OTI4MjI4LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMEtKUVIxQ1YzWlE2N0NSWlRNUjJFVDAifQ.icFOts7WOu_Kz3TP1n6IRwC4uQv4ENHyMpLOaf6TMTFirXBRV2KyyqMnsZdUkzHZN-DfeeIOotN08lRTdKXZ7XXUq8lfafSQPERgNFOnsLjTYh19LyNi8h7fa36PE9Wv6nwnLws7qv_pJB5vKOVOYQf9ZXc-DTmZ_b2l-sagtwFJ5LW6tW80ph3Vl-XBZvqu1egZJRLH4pfpNq0NWyT9_gJz06SqYZSeY19orhKhaEi1tw3Uzf0jaOWhx5pw7TOF5IiXNEAeZ3e2mQn5rnAoPNVzMWiYgtmAPa74liQHrNRFEeBBApkVLT4eExxtcYuqz85FUAknj5qB5MN99qp62Q'
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
            authorizationToken: 'eyJraWQiOiJqd3QtZXhjaGFuZ2VfZDQ6ZWY6NjQ6NzY6YWY6MjI6MWY6NDg6MTA6MDM6ZTQ6NjE6NmU6Y2M6Nzk6MmYiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJlbWFpbCI6ImFhcm9uNzdAcG9zdGUuaXQiLCJmYW1pbHlfbmFtZSI6Ik1hbmNpbmkiLCJmaXNjYWxfbnVtYmVyIjoiTU5DQ1NEMDFSMTNBNzU3RyIsIm5hbWUiOiJDZXNpZGlhIiwiZnJvbV9hYSI6ZmFsc2UsInVpZCI6ImYwYmNkNDY4LWQ4NTMtNGM2NC1iZmIxLTNlNDdiNTI0NTVmMSIsImxldmVsIjoiTDIiLCJpYXQiOjE2NTk5NjU0NzcsImV4cCI6MTY1OTk2NTQ5MiwiYXVkIjoicG9ydGFsZS1wYS5jb2xsLnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vdWF1LnNmbGZkYXJlLnBhZ29wYS5pdCIsImp0aSI6ImY5NjY5ZDY2LTQ1YWItNDJkZC1iZGRiLTVlMGU0MzA3ZTNiNCIsIm9yZ2FuaXphdGlvbiI6eyJpZCI6IjAyNmU4YzcyLTc5NDQtNGRjZC04NjY4LWY1OTY0NDdmZWM2ZCIsInJvbGVzIjpbeyJwYXJ0eVJvbGUiOiJNQU5BR0VSIiwicm9sZSI6ImFkbWluIn1dLCJmaXNjYWxfY29kZSI6IjAxMTk5MjUwMTU4In0sImRlc2lyZWRfZXhwIjoxNjU5OTg2NzQ1fQ.myHzn15A7cUs1svFf3bM565sB0JUkd9c4Sz-67FJ7H4qImAPqOFC2dDcl0dVhY_PTJwtewinvllhTsEU0pDDLLWoAUW5Zf_UMsPo1u_Ct1_GZzDQuhthbeHZWxQJaNCmp2wgGBItHOiDSd1pm7YisKowcfgVWF_8czb_L5rnKO5WwN4G1ZqBU-7TqSMjixcoUA9uHKVO8Yj2e5cbJ_GSdgYW78y9UuLmLlI0GIylvZKSTDAkUDHnOOGD8hw4qQ5mJKZ3D_ntHO7GWW-IX_LJRL5SGYpW2ux3obNlJyHJgxHAZrDkhBIr__dFQ-qIVJUfGCj2ffu0LuoEVgjoWmvpbQ'
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
            expect(body.error).to.match(/origin not allowed/i)
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
            expect(body.error).to.match(/invalid algorithm/i)
            done();
        }).catch(done); // Catch assertion errors
    });
})

describe("Not allowed role", function () {
    // put valid token with not allowed role
    const expiredToken = {
        headers:{
            origin: 'https://portale-pa-develop.fe.dev.pn.pagopa.it'
        },
        queryStringParameters:{
            authorizationToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY0OTkyNDYyOCwiZXhwIjoxNjQ5OTI4MjI4LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMEtKUVIxQ1YzWlE2N0NSWlRNUjJFVDAifQ.icFOts7WOu_Kz3TP1n6IRwC4uQv4ENHyMpLOaf6TMTFirXBRV2KyyqMnsZdUkzHZN-DfeeIOotN08lRTdKXZ7XXUq8lfafSQPERgNFOnsLjTYh19LyNi8h7fa36PE9Wv6nwnLws7qv_pJB5vKOVOYQf9ZXc-DTmZ_b2l-sagtwFJ5LW6tW80ph3Vl-XBZvqu1egZJRLH4pfpNq0NWyT9_gJz06SqYZSeY19orhKhaEi1tw3Uzf0jaOWhx5pw7TOF5IiXNEAeZ3e2mQn5rnAoPNVzMWiYgtmAPa74liQHrNRFEeBBApkVLT4eExxtcYuqz85FUAknj5qB5MN99qp62Q'
        }
    }

    it.skip("with code = 403", function (done) {
        lambdaTester( lambda.handler )
          .event( expiredToken )
          .expectResult((result) => {
              // Check if code exist
              console.debug('the result is ', result);
              expect(result.statusCode).to.equal(403);
              const body = JSON.parse(result.body);
              expect(body.error).to.exist;
              expect(body.error).to.match(/role not allowed/i)
              done();
          }).catch(done); // Catch assertion errors
    });
});