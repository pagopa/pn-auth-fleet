const fs = require("fs");
const jsonwebtoken = require("jsonwebtoken");
const sinon = require("sinon");
const { expect } = require("chai");
const rewire = require("rewire");
const proxyquire = require("proxyquire");

const tokenGen = rewire("../app/tokenGen.js");
const retrieverJwks = require("../app/retrieverJwks.js");
const utils = require("../app/utils");

const enrichedToken = {
  email: "info@agid.gov.it",
  family_name: "Rossi",
  fiscal_number: "GDNNWA12H81Y874F",
  mobile_phone: "333333334",
  name: "Mario",
  from_aa: false,
  uid: "ed84b8c9-444e-410d-80d7-cfad6aa12070",
  level: "L2",
  iat: 1649686749,
  exp: 1649690349,
  aud: "portale-pf-develop.fe.dev.pn.pagopa.it",
  iss: "https://spid-hub-test.dev.pn.pagopa.it",
  jti: "01G0CFW80HGTTW0RH54WQD6F6S",
  organization: {
    id: "026e8c72-7944-4dcd-8668-f596447fec6d",
    roles: [
      {
        partyRole: "MANAGER",
        role: "admin",
      },
    ],
    groups: ["62e941d313b0fc6edad4535a"],
    hasGroups: true,
    fiscal_code: "01199250158",
  },
  sessionToken: "",
};

const revert = tokenGen.__set__({
  getSignature: () => ({ Signature: "signature" }),
  getKeyId: () => Promise.resolve("keyId"),
});

const { handleEvent } = proxyquire.noCallThru().load("../app/eventHandler.js", {
  "./tokenGen.js": tokenGen,
});

describe("test eventHandler", () => {
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

  after(() => {
    sinon.restore();
    revert();
  });

  it("handle event without origin", async () => {
    const result = await handleEvent({
      headers: {
        httpMethod: "POST",
        origin: "",
      },
      body: JSON.stringify({
        authorizationToken: "",
      }),
    });
    expect(result.statusCode).to.equal(500);
    const body = JSON.parse(result.body);
    expect(body.error).to.be.equal("eventOrigin is null");
    expect(body.traceId).to.be.equal(process.env._X_AMZN_TRACE_ID);
  });

  it("handle event with not allowed origin", async () => {
    const result = await handleEvent({
      headers: {
        httpMethod: "POST",
        origin: "origin-not-allowed",
      },
      body: JSON.stringify({
        authorizationToken: "",
      }),
    });
    expect(result.statusCode).to.equal(500);
    const body = JSON.parse(result.body);
    expect(body.error).to.be.equal("Origin not allowed");
    expect(body.traceId).to.be.equal(process.env._X_AMZN_TRACE_ID);
  });

  it("handle event without token", async () => {
    const result = await handleEvent({
      headers: {
        httpMethod: "POST",
        origin: "https://portale-pa-develop.fe.dev.pn.pagopa.it",
      },
      body: JSON.stringify({
        authorizationToken: "",
      }),
    });
    expect(result.statusCode).to.equal(500);
    const body = JSON.parse(result.body);
    expect(body.error).to.be.equal("AuthorizationToken not present");
    expect(body.traceId).to.be.equal(process.env._X_AMZN_TRACE_ID);
  });

  it("handle event with invalid token", async () => {
    const result = await handleEvent({
      headers: {
        httpMethod: "POST",
        origin: "https://portale-pa-develop.fe.dev.pn.pagopa.it",
      },
      body: JSON.stringify({
        authorizationToken: "fake-token",
      }),
    });
    expect(result.statusCode).to.equal(400);
    const body = JSON.parse(result.body);
    expect(body.error).to.be.equal("Token is not valid");
    expect(body.traceId).to.be.equal(process.env._X_AMZN_TRACE_ID);
  });

  it("handle event with valid token", async () => {
    // test token exchange
    const result = await handleEvent({
      httpMethod: "POST",
      headers: {
        origin: "https://portale-pa-develop.fe.dev.pn.pagopa.it",
      },
      body: JSON.stringify({
        authorizationToken:
          "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY0OTY4Njc0OSwiZXhwIjoxNjQ5NjkwMzQ5LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMENGVzgwSEdUVFcwUkg1NFdRRDZGNlMiLCJvcmdhbml6YXRpb24iOnsiaWQiOiIwMjZlOGM3Mi03OTQ0LTRkY2QtODY2OC1mNTk2NDQ3ZmVjNmQiLCJyb2xlcyI6W3sicGFydHlSb2xlIjoiTUFOQUdFUiIsInJvbGUiOiJhZG1pbiJ9XSwiZ3JvdXBzIjpbIjYyZTk0MWQzMTNiMGZjNmVkYWQ0NTM1YSJdLCJmaXNjYWxfY29kZSI6IjAxMTk5MjUwMTU4In19.kNdfWLhZTxust5GOjTXoh03G9Px5KGOri9w6gV2xFc2FftjjguNZV2FxtkBKrzKmjH8BHQTpRO0hJV3uCb8zW_VHW3hbqwDQjw5MGYOMeAmR5xmlkVfF0Xd_7eaAPQv8VevceYypkMaq0UBzQR1SkBYKPj0Dn9ga52WAsJ-2P5cLSzSA52nVkISvAaAqOLg1-eoiVLv8KGw_STKctHq60SuQFa9vmXTDHblebR30SN9vFv0AJEj0oaw_pTWRjG3wW2pVJwhLrefwhS00n8E04649hTkcUPa9JxVBDwFgcDTJyii2KBSAJ0kmi7IO20VBiESmaeZQSpsH4JpkMnjyIIO9jjIkicssfW0HeAcJLZUfCo21lZcXh9kzxAXCrZ_rK09RUew7hZwP3Xpt4X-4DS1YzXfwl4So5ayDv38zsOocT10EJEEKQg8UOCSXzh8_-MgMsukU6fgdXny3epvLKq0aahtP3vqSbl9wZd5aPPEklU08PS-bWifw2Qa8gozzSR-MOPGTdLun5230Z1MQJmyJXy_HJuLIKeKMMfCAinhR5476xBE2bpC_gjvPcr7LGfUYTI6ZRLDFf96Muf48hq0bGWZzT2nxOBs5WpWQcOvPw3XIgQ8Th9wWSOWiSakpyT-AIpbj7K83Z-HkHIUwqzgbtApRPNhnlzaMrRELqF0",
      }),
    });
    expect(result.statusCode).to.equal(200);
    const body = JSON.parse(result.body);
    expect(body.error).to.be.undefined;
    // calc sessionToken
    const sessionToken = await tokenGen.generateToken(enrichedToken);
    expect(body).to.be.eql({ ...enrichedToken, sessionToken });
  });

  it("handle event with uppercase origin in headers", async () => {
    const result = await handleEvent({
      httpMethod: "POST",
      headers: {
        Origin: "https://portale-pa-develop.fe.dev.pn.pagopa.it",
      },
      body: JSON.stringify({
        authorizationToken:
          "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY0OTY4Njc0OSwiZXhwIjoxNjQ5NjkwMzQ5LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMENGVzgwSEdUVFcwUkg1NFdRRDZGNlMiLCJvcmdhbml6YXRpb24iOnsiaWQiOiIwMjZlOGM3Mi03OTQ0LTRkY2QtODY2OC1mNTk2NDQ3ZmVjNmQiLCJyb2xlcyI6W3sicGFydHlSb2xlIjoiTUFOQUdFUiIsInJvbGUiOiJhZG1pbiJ9XSwiZ3JvdXBzIjpbIjYyZTk0MWQzMTNiMGZjNmVkYWQ0NTM1YSJdLCJmaXNjYWxfY29kZSI6IjAxMTk5MjUwMTU4In19.kNdfWLhZTxust5GOjTXoh03G9Px5KGOri9w6gV2xFc2FftjjguNZV2FxtkBKrzKmjH8BHQTpRO0hJV3uCb8zW_VHW3hbqwDQjw5MGYOMeAmR5xmlkVfF0Xd_7eaAPQv8VevceYypkMaq0UBzQR1SkBYKPj0Dn9ga52WAsJ-2P5cLSzSA52nVkISvAaAqOLg1-eoiVLv8KGw_STKctHq60SuQFa9vmXTDHblebR30SN9vFv0AJEj0oaw_pTWRjG3wW2pVJwhLrefwhS00n8E04649hTkcUPa9JxVBDwFgcDTJyii2KBSAJ0kmi7IO20VBiESmaeZQSpsH4JpkMnjyIIO9jjIkicssfW0HeAcJLZUfCo21lZcXh9kzxAXCrZ_rK09RUew7hZwP3Xpt4X-4DS1YzXfwl4So5ayDv38zsOocT10EJEEKQg8UOCSXzh8_-MgMsukU6fgdXny3epvLKq0aahtP3vqSbl9wZd5aPPEklU08PS-bWifw2Qa8gozzSR-MOPGTdLun5230Z1MQJmyJXy_HJuLIKeKMMfCAinhR5476xBE2bpC_gjvPcr7LGfUYTI6ZRLDFf96Muf48hq0bGWZzT2nxOBs5WpWQcOvPw3XIgQ8Th9wWSOWiSakpyT-AIpbj7K83Z-HkHIUwqzgbtApRPNhnlzaMrRELqF0",
      }),
    });
    expect(result.statusCode).to.equal(200);
    const body = JSON.parse(result.body);
    expect(body.error).to.be.undefined;
    // calc sessionToken
    const sessionToken = await tokenGen.generateToken(enrichedToken);
    expect(body).to.be.eql({ ...enrichedToken, sessionToken });
  });
});
