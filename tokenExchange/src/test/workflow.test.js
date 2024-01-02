const { expect } = require("chai");
const lambdaTester = require("lambda-tester");
const jsonwebtoken = require("jsonwebtoken");
const sinon = require("sinon");
const fs = require("fs");
const rewire = require("rewire");
const proxyquire = require("proxyquire");

const tokenGen = rewire("../app/tokenGen.js");
const retrieverJwks = require("../app/retrieverJwks.js");
const utils = require("../app/utils");

let signatureResponse = "success";

const revert = tokenGen.__set__({
  getSignature: () => {
    if (signatureResponse === "error") {
      throw Error("Error when getting signature");
    }
    return { Signature: "signature" };
  },
  getKeyId: () => Promise.resolve("keyId"),
});

const eventHandler = proxyquire.noCallThru().load("../app/eventHandler.js", {
  "./tokenGen.js": tokenGen,
});

const lambda = proxyquire.noCallThru().load("../../index.js", {
  "./src/app/eventHandler.js": eventHandler,
});

/** PN-1129
sign function mock breaks using X-Ray, probably due to non-compatible versions
can't find the correct ones
import AWS from 'aws-sdk-mock';
AWS.mock('KMS', 'sign', function (_params, callback) {
    callback(null, {Signature:'signature'});
});
15/09/2023 - Resolved by implementing a mock of the KMSClient and SignCommand 
from aws-sdk-client-mock library.
*/

describe("workflow", function () {
  const event = {
    headers: {
      httpMethod: "POST",
      origin: "https://portale-pa-develop.fe.dev.pn.pagopa.it",
    },
    body: {},
  };

  before(() => {
    // mock get jwks response
    sinon.stub(retrieverJwks, "getJwks").callsFake((issuer) => {
      const result = fs.readFileSync(
        "./src/test/jwks-mock/" + issuer.replace("https://", "") + ".jwks.json",
        { encoding: "utf8" }
      );
      return JSON.parse(result);
    });
    // mock parameter store
    sinon
      .stub(utils, "getParameterFromStore")
      .callsFake(() => "GDNNWA12H81Y874F");
    // mock token verify
    sinon.stub(jsonwebtoken, "verify").returns("token.token.token");
  });

  beforeEach(() => {
    signatureResponse = "success";
  });

  after(() => {
    sinon.restore();
    revert();
  });

  it("expired token from SC - with code = 400", function (done) {
    event.body = JSON.stringify({
      authorizationToken:
        "eyJraWQiOiJqd3QtZXhjaGFuZ2VfZDQ6ZWY6NjQ6NzY6YWY6MjI6MWY6NDg6MTA6MDM6ZTQ6NjE6NmU6Y2M6Nzk6MmYiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJlbWFpbCI6ImFhcm9uNzdAcG9zdGUuaXQiLCJmYW1pbHlfbmFtZSI6Ik1hbmNpbmkiLCJmaXNjYWxfbnVtYmVyIjoiTU5DQ1NEMDFSMTNBNzU3RyIsIm5hbWUiOiJDZXNpZGlhIiwiZnJvbV9hYSI6ZmFsc2UsInVpZCI6ImYwYmNkNDY4LWQ4NTMtNGM2NC1iZmIxLTNlNDdiNTI0NTVmMSIsImxldmVsIjoiTDIiLCJpYXQiOjE2NTk5NjU0NzcsImV4cCI6MTY1OTk2NTQ5MiwiYXVkIjoicG9ydGFsZS1wYS5jb2xsLnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vdWF0LnNlbGZjYXJlLnBhZ29wYS5pdCIsImp0aSI6ImY5NjY5ZDY2LTQ1YWItNDJkZC1iZGRiLTVlMGU0MzA3ZTNiNCIsIm9yZ2FuaXphdGlvbiI6eyJpZCI6IjAyNmU4YzcyLTc5NDQtNGRjZC04NjY4LWY1OTY0NDdmZWM2ZCIsInJvbGVzIjpbeyJwYXJ0eVJvbGUiOiJNQU5BR0VSIiwicm9sZSI6ImFkbWluIn1dLCJmaXNjYWxfY29kZSI6IjAxMTk5MjUwMTU4In0sImRlc2lyZWRfZXhwIjoxNjU5OTg2NzQ1fQ.myHzn15A7cUs1svFf3bM565sB0JUkd9c4Sz-67FJ7H4qImAPqOFC2dDcl0dVhY_PTJwtewinvllhTsEU0pDDLLWoAUW5Zf_UMsPo1u_Ct1_GZzDQuhthbeHZWxQJaNCmp2wgGBItHOiDSd1pm7YisKowcfgVWF_8czb_L5rnKO5WwN4G1ZqBU-7TqSMjixcoUA9uHKVO8Yj2e5cbJ_GSdgYW78y9UuLmLlI0GIylvZKSTDAkUDHnOOGD8hw4qQ5mJKZ3D_ntHO7GWW-IX_LJRL5SGYpW2ux3obNlJyHJgxHAZrDkhBIr__dFQ-qIVJUfGCj2ffu0LuoEVgjoWmvpbQ",
    });
    lambdaTester(lambda.handler)
      .event(event)
      .expectResult((result) => {
        // Check if code exist
        console.debug("the result is ", result);
        expect(result.statusCode).to.equal(400);
        const body = JSON.parse(result.body);
        expect(body.error).to.exist;
        done();
      })
      .catch(done); // Catch assertion errors
  });

  it("invalid Audience from spidhub - with code = 400", function (done) {
    event.body = JSON.stringify({
      authorizationToken:
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY0NTA4OTQyMiwiZXhwIjoxNjQ1MDkzMDIyLCJpc3MiOiJzcGlkaHViLXRlc3QuZGV2LnBuLnBhZ29wYS5pdCIsImp0aSI6IjAxRlczRkdaSFBTVzJYWjQxODlNRks2NFhCIn0.tOymeT30jdQEDTYZdodJeRusAuwmigy4uNupnYOoFg9fb1mNGPsqR8mKjl1sTYgEgrMaO8ItUeIMjXd4jnYk_djbB8ZqK-Dpooa0Wfr__rCXY8zl2mUjIvAbUsadSKEcjyFJbLYWCdOInvPezY58qhpkN2ZCiue7t77hzROIFjx5dkC4DIZHcS3MmdWrK2Ufe4P-uc7hpmHYX1kqW2MpIJLBd5-iJKU8-dGRGJ6mm2bwGhQgwwsuwmk09BtFOH9uqHvl0IpQDkOkBcfoCuzPzbzOAPlxwVPaJNv3rMC4-9yjlgaS6vZX3K-gkpia2atyjoB_lptPmz_33OLF3-rvQw",
    });
    lambdaTester(lambda.handler)
      .event(event)
      .expectResult((result) => {
        // Check if code exist
        console.debug("the result is ", result);
        expect(result.statusCode).to.equal(400);
        const body = JSON.parse(result.body);
        expect(body.error).to.exist;
        expect(body).to.contain(/invalid audience/i);
        done();
      })
      .catch(done); // Catch assertion errors
  });

  it("token from spidhub with error on getting signature - with code = 500", function (done) {
    signatureResponse = "error";
    event.body = JSON.stringify({
      authorizationToken:
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY0OTkyNDYyOCwiZXhwIjoxNjQ5OTI4MjI4LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMEtKUVIxQ1YzWlE2N0NSWlRNUjJFVDAifQ.icFOts7WOu_Kz3TP1n6IRwC4uQv4ENHyMpLOaf6TMTFirXBRV2KyyqMnsZdUkzHZN-DfeeIOotN08lRTdKXZ7XXUq8lfafSQPERgNFOnsLjTYh19LyNi8h7fa36PE9Wv6nwnLws7qv_pJB5vKOVOYQf9ZXc-DTmZ_b2l-sagtwFJ5LW6tW80ph3Vl-XBZvqu1egZJRLH4pfpNq0NWyT9_gJz06SqYZSeY19orhKhaEi1tw3Uzf0jaOWhx5pw7TOF5IiXNEAeZ3e2mQn5rnAoPNVzMWiYgtmAPa74liQHrNRFEeBBApkVLT4eExxtcYuqz85FUAknj5qB5MN99qp62Q",
    });
    lambdaTester(lambda.handler)
      .event({
        ...event,
        headers: {
          ...event.headers,
          origin: "https://portale-pf-develop.fe.dev.pn.pagopa.it",
        },
      })
      .expectResult((result) => {
        // Check if code exist
        console.debug("the result is ", result);
        expect(result.statusCode).to.equal(500);
        const body = JSON.parse(result.body);
        expect(body.error).to.exist;
        done();
      })
      .catch(done); // Catch assertion errors
  });

  it("invalid issuer - with code = 400", function (done) {
    event.body = JSON.stringify({
      authorizationToken:
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY0OTY4Njc0OSwiZXhwIjoxNjQ5NjkwMzQ5LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vd3Jvbmdpc3N1ZXIuaXQiLCJqdGkiOiIwMUcwQ0ZXODBIR1RUVzBSSDU0V1FENkY2UyIsInJvbGVzIjpbeyJyb2xlIjoib3RoZXIiLCJwYXJ0eVJvbGUiOiJPVEhFUiJ9XX0.LFSD_fm_JuMhA1A_aP11tMf4XM2Xs6ZVgICSjBCCzhBwVpf3dLMfiLJBsaUmotn9kLfOS1bTaDClXoQ1knVDoZqQn_H-cf51taoUpe6OFINcCBg6O6umhyroDGRQzO3hQodgVWcl1-c6p_lCcfVdnn5nEZAPTsO3VgUqC3Igvkz4SdV-lSw4SgRw-p_gDep6lPKXsxxredjd3Ob-3LJSOKPpQPB1BbvsWCdBkkHgwFbOoKxyayfZOmjQSooSLhMRYuRI8dlI6F4q02fZH8k5tb_NnyaHax6eWjKjfHVMSSbmWVddFN_VV4uy107A_Btl4hXDaXBLbrUWUOi7QQsho6uxeufkqh6NBmkac1obhZb-tjVhTQZclqoGWl1aAwOdk-ht3dIX_cPxQ40gvQ7ECxVk2mdp7glKqrUBj3im7CIHOnJC4B2bglhFGP5kyOKWn9YTAeZo9R0Irsgc3VH2mmpNL6XHFqKSyx-fVezCkqLPLliKIASK31f_fnPYKhEfGR0ufoQQj06_Yhyps9hrbM1LLMcm2tc1DsYG_nfuZYtafLJcdbjkRxev5GeCxQqq92CFYqfb2AoMl18ar-Nzmp2_nVDm3mkbAgCYts_J3Xe1ZXwkkfsQ_p80_8ODq8bqNbTLsn7JnLICEG0eKyy8qtJX_HaylKkHKCXqzfP6e9o",
    });
    lambdaTester(lambda.handler)
      .event(event)
      .expectResult((result) => {
        // Check if code exist
        console.debug("the result is ", result);
        expect(result.statusCode).to.equal(400);
        const body = JSON.parse(result.body);
        expect(body.error).to.exist;
        expect(body.error).to.match(/issuer not known/i);
        done();
      })
      .catch(done); // Catch assertion errors
  });

  it("invalid origin - with code = 500", function (done) {
    event.body = JSON.stringify({
      authorizationToken:
        "eyJraWQiOiJqd3QtZXhjaGFuZ2VfZDQ6ZWY6NjQ6NzY6YWY6MjI6MWY6NDg6MTA6MDM6ZTQ6NjE6NmU6Y2M6Nzk6MmYiLCJhbGciOiJSUzI1NiJ9.1eyJlbWFpbCI6InJhb3VsODdAbGliZXJvLml0IiwiZmFtaWx5X25hbWUiOiJHYWxsaSIsImZpc2NhbF9udW1iZXIiOiJHTExNUkE3N000M0EzMzJPIiwibmFtZSI6Ik1hdXJvIiwiZnJvbV9hYSI6ZmFsc2UsInVpZCI6IjEyZTNjNWE4LTA2NWItNDExZi1hMzY0LWYxOGQ2NjI0MmU0ZiIsImxldmVsIjoiTDIiLCJpYXQiOjE2NDM2NDMyNzcsImV4cCI6MTU4MDYzNzQ0OCwiaXNzIjoiYXBpLnNlbGZjYXJlLnBhZ29wYS5pdCIsImp0aSI6IjAyOTdjYTllLTRhZWMtNDRiMy04M2FkLTAwYWI5NGI0ZWU4NyIsImF1ZCI6Ind3dy5iZXRhLnBuLnBhZ29wYS5pdCIsIm9yZ2FuaXphdGlvbiI6eyJpZCI6ImNfaDI4MiIsInJvbGUiOiJyZWZlcmVudGUgYW1taW5pc3RyYXRpdm8iLCJmaXNjYWxfY29kZSI6IjAwMTAwNzAwNTc0In0sImRlc2lyZWRfZXhwIjoxNjQzNjQ2ODcwfQ.iswF_C9_41zMM3aohGfBX_7lHpACGAWKAYX-JEuQTmP44A-phPRNR2SGcsdcjHqTs3vIK2fk7TUnC5TI8KyWOyTKCBP5LsTSQusbPoc3UHwToAiLVCAztC6U7SN73DIVzigHssrir-Yn5tJLSkpU_RvoLVxM9PDIp6HqwKsGU4dDGzLmSBRgNk-zRTK_BCY47bInYXxCQRLu7qFW-vGteVFj1E7OEMCubKpgm7jG48q6BwdZHcy9PN8Tq6v3O2wKy28tQKvFMYdLrZR5KuKtRzJeRXn0PwhXfCW6N9e8PmbYT78o0cg2_y7wX85h-KqA57hbxWsNZY3LNVkztAbeVQ",
    });
    lambdaTester(lambda.handler)
      .event({
        ...event,
        headers: {
          ...event.headers,
          origin: "https://portale-fake-develop.fe.dev.pn.pagopa.it",
        },
      })
      .expectResult((result) => {
        // Check if code exist
        console.debug("the result is ", result);
        expect(result.statusCode).to.equal(500);
        const body = JSON.parse(result.body);
        expect(body.error).to.exist;
        expect(body.error).to.match(/origin not allowed/i);
        done();
      })
      .catch(done); // Catch assertion errors
  });

  it("invalid algorithm - with code = 400", function (done) {
    event.body = JSON.stringify({
      authorizationToken:
        "eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY0OTY4Njc0OSwiZXhwIjoxNjQ5NjkwMzQ5LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMENGVzgwSEdUVFcwUkg1NFdRRDZGNlMifQ.CRd7N1ceNzb-oh3Xk8uffUjS6PHKcO8-zf9WOOvVH8C4tH-8m92wTH02j1dH5Q3pObBbmiU-EE6-ClDycuoRqNgk1aj4O9HHzSVHMKVlHeSsfPyHtmEC9sr817poooCkYZ9FZ-3bVnzzrXtmlA_KiwA49zpJoJ-QnZmblJVm0e3tt0RQHfPxekgjQOmd_ZscidHIMQd1AsshJyM-SfuHQzpWRb9jixby264kf1TL8UtxfAe47ipOGqxA5Ds6R0PSk8gR3fcdSuolZOVwSlnR_Ojt3-vgTJEJ07GPywLMBQzIx1qKIDcRBtG_B1Xt5N0Zublcw_V92EZ957Y_XSLl5w",
    });
    lambdaTester(lambda.handler)
      .event(event)
      .expectResult((result) => {
        // Check if code exist
        console.debug("the result is ", result);
        expect(result.statusCode).to.equal(400);
        const body = JSON.parse(result.body);
        expect(body.error).to.exist;
        expect(body.error).to.match(/invalid algorithm/i);
        done();
      })
      .catch(done); // Catch assertion errors
  });

  it("not allowed role - with code = 403", function (done) {
    event.body = JSON.stringify({
      authorizationToken:
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY0OTY4Njc0OSwiZXhwIjoxNjQ5NjkwMzQ5LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMENGVzgwSEdUVFcwUkg1NFdRRDZGNlMiLCJvcmdhbml6YXRpb24iOnsiaWQiOiIwMjZlOGM3Mi03OTQ0LTRkY2QtODY2OC1mNTk2NDQ3ZmVjNmQiLCJyb2xlcyI6W3sicGFydHlSb2xlIjoiT1RIRVIiLCJyb2xlIjoib3RoZXIifV0sImdyb3VwcyI6WyI2MmU5NDFkMzEzYjBmYzZlZGFkNDUzNWEiXSwiZmlzY2FsX2NvZGUiOiIwMTE5OTI1MDE1OCJ9fQ.loEiMIjCDEB728xzmYJnqB6Wwmo3BygOmMaiRO3N_DbJuP-2ZLivYGAuFk1CIQgJt1_-q0dC9vFdYq-42xbOE6ftk4dtlfNC90NBomZ3hZ1-0EOjxAkGelDBI7DmYk-Knw7jY00UCdp66GeZEfD0fonw_eet6OVDGCUgHqq_d1bgZxXsy_vn0nmqWIIrwABaMliLM2gya8xHzmuWSKhaWvMifDGtjVoiAv79L3L770Zf50XXnhMIL49h8Yx9WT-PRcojffsf84UDGVZ7lIQcr-KcdGt6kYU_t6ZO9408lEfBoCPR8HwmNB2PgLdm9exD-dI-lVx-xnY53uEE2knJEp-3wk9wxgqfW-apR_Nd5LYz27ABMTpo7jlwK8mKN8LOvxh014zo93tGWv_WuBFLszC-Twfs2Syv9OmNKjBjU8YWdbZLIrkDAQEqMs66RH7ypqjQ7Dk-HIeJYV39mmlp9O6Eo1ncluT-Lwb2wj1I1QuLkmW2bv0OcrFSR1sCo6g3zJ1LQHU6U6vYMBES7xCKyRj8Y30hv8iTl7POj1G_SMD1ZSNUDW2HmPlIBuecdW5OxahiDv1n0LMbOFMTaEbR-Di0hcIXHzVTKWUG4VOtdAS0WSvYunA6POFaH9_2aB5JpF8HddKfArXfBbaLPvuxq1xolCQSvY6GAzwPkMbHztI",
    });
    lambdaTester(lambda.handler)
      .event(event)
      .expectResult((result) => {
        // Check if code exist
        console.debug("the result is ", result);
        expect(result.statusCode).to.equal(403);
        const body = JSON.parse(result.body);
        expect(body.error).to.exist;
        expect(body.error).to.match(/role not allowed/i);
        done();
      })
      .catch(done); // Catch assertion errors
  });

  it("not allowed taxId - with code = 451", function (done) {
    event.body = JSON.stringify({
      authorizationToken:
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEEiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY0OTY4Njc0OSwiZXhwIjoxNjQ5NjkwMzQ5LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMENGVzgwSEdUVFcwUkg1NFdRRDZGNlMiLCJvcmdhbml6YXRpb24iOnsiaWQiOiIwMjZlOGM3Mi03OTQ0LTRkY2QtODY2OC1mNTk2NDQ3ZmVjNmQiLCJyb2xlcyI6W3sicGFydHlSb2xlIjoiTUFOQUdFUiIsInJvbGUiOiJhZG1pbiJ9XSwiZ3JvdXBzIjpbIjYyZTk0MWQzMTNiMGZjNmVkYWQ0NTM1YSJdLCJmaXNjYWxfY29kZSI6IjAxMTk5MjUwMTU4In19.PrlZTKA21sSOF3mh3TKziXfDgxSZJBPzWWqtbI_5wWVo3C0MT6ZdemOGw8OKYxmMvWpkIwJjTJ4zf2plAqxAaO52olY5zbbrOES5zo2AkwURVHVgnJw6CihSGqrtfB2bgmLUYo1yI-qZRwauDOqa4KyZs9R1fNJFSbDBZUaD8Id7-bNH4i599b_cdBRnrrJSMjNwViyD_s3Eu98LxgoJoQDKCfbQlR90-cnG61S_-zNQkDqEztsePa45GpthpCh9wCDgCmLWfXlwfXXp7P-q_LRO_AWWJx203VFl9rtXXih5VV0AYdPFEJdR9dXHzcuA2tdKStB6EwBj7DXzqqVECQ",
    });
    lambdaTester(lambda.handler)
      .event(event)
      .expectResult((result) => {
        // Check if code exist
        console.debug("the result is ", result);
        expect(result.statusCode).to.equal(451);
        const body = JSON.parse(result.body);
        expect(body.error).to.exist;
        expect(body.error).to.match(/taxid not allowed/i);
        done();
      })
      .catch(done); // Catch assertion errors
  });

  it("executes the token exchange successfully - with code = 200", function (done) {
    event.body = JSON.stringify({
      authorizationToken:
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY0OTY4Njc0OSwiZXhwIjoxNjQ5NjkwMzQ5LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMENGVzgwSEdUVFcwUkg1NFdRRDZGNlMiLCJvcmdhbml6YXRpb24iOnsiaWQiOiIwMjZlOGM3Mi03OTQ0LTRkY2QtODY2OC1mNTk2NDQ3ZmVjNmQiLCJyb2xlcyI6W3sicGFydHlSb2xlIjoiTUFOQUdFUiIsInJvbGUiOiJhZG1pbiJ9XSwiZ3JvdXBzIjpbIjYyZTk0MWQzMTNiMGZjNmVkYWQ0NTM1YSJdLCJmaXNjYWxfY29kZSI6IjAxMTk5MjUwMTU4In19.kNdfWLhZTxust5GOjTXoh03G9Px5KGOri9w6gV2xFc2FftjjguNZV2FxtkBKrzKmjH8BHQTpRO0hJV3uCb8zW_VHW3hbqwDQjw5MGYOMeAmR5xmlkVfF0Xd_7eaAPQv8VevceYypkMaq0UBzQR1SkBYKPj0Dn9ga52WAsJ-2P5cLSzSA52nVkISvAaAqOLg1-eoiVLv8KGw_STKctHq60SuQFa9vmXTDHblebR30SN9vFv0AJEj0oaw_pTWRjG3wW2pVJwhLrefwhS00n8E04649hTkcUPa9JxVBDwFgcDTJyii2KBSAJ0kmi7IO20VBiESmaeZQSpsH4JpkMnjyIIO9jjIkicssfW0HeAcJLZUfCo21lZcXh9kzxAXCrZ_rK09RUew7hZwP3Xpt4X-4DS1YzXfwl4So5ayDv38zsOocT10EJEEKQg8UOCSXzh8_-MgMsukU6fgdXny3epvLKq0aahtP3vqSbl9wZd5aPPEklU08PS-bWifw2Qa8gozzSR-MOPGTdLun5230Z1MQJmyJXy_HJuLIKeKMMfCAinhR5476xBE2bpC_gjvPcr7LGfUYTI6ZRLDFf96Muf48hq0bGWZzT2nxOBs5WpWQcOvPw3XIgQ8Th9wWSOWiSakpyT-AIpbj7K83Z-HkHIUwqzgbtApRPNhnlzaMrRELqF0",
    });
    lambdaTester(lambda.handler)
      .event(event)
      .expectResult((result) => {
        // Check if code exist
        console.debug("the result is", result);
        expect(result.statusCode).to.equal(200);
        const body = JSON.parse(result.body);
        expect(body.error).to.be.undefined;
        done();
      })
      .catch(done); // Catch assertion errors
  });
});
