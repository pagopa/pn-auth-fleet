const chaiAsPromised = require("chai-as-promised");
const chai = require("chai");
const jsonwebtoken = require("jsonwebtoken");
const sinon = require("sinon");
const rewire = require("rewire");
const fs = require("fs");
const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");

chai.use(chaiAsPromised);
const expect = chai.expect;

const validator = rewire("../app/validation");
const retrieverJwks = require("../app/retrieverJwks");
const ValidationException = require("../app/exception/validationException");

const decodedToken = {
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
    fiscal_code: "01199250158",
  },
};

function mockGetTaxIdFromStore(taxIdParameterValue) {
  const mock = new MockAdapter(axios);
  mock
    .onGet(
      `http://localhost:2773/systemsmanager/parameters/get?name=${encodeURIComponent(
        process.env.ALLOWED_TAXIDS_PARAMETER
      )}`
    )
    .reply(200, JSON.stringify({ Parameter: { Value: taxIdParameterValue } }));
}

describe("test validation", () => {
  before(() => {
    // mock methods for token exchange
    sinon.stub(retrieverJwks, "getJwks").callsFake((issuer) => {
      const result = fs.readFileSync(
        "./src/test/jwks-mock/" + issuer.replace("https://", "") + ".jwks.json",
        { encoding: "utf8" }
      );
      return JSON.parse(result);
    });
    sinon.stub(jsonwebtoken, "verify").returns("token.token.token");
  });

  after(() => {
    sinon.reset();
    sinon.restore();
  });

  it("test the token validation - token null", async () => {
    await expect(validator.validation(null)).to.be.rejectedWith(
      ValidationException,
      "Token is not valid"
    );
  });

  it("test the token validation - worng algorithm", async () => {
    await expect(
      validator.validation(
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY0OTY4Njc0OSwiZXhwIjoxNjQ5NjkwMzQ5LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMENGVzgwSEdUVFcwUkg1NFdRRDZGNlMiLCJvcmdhbml6YXRpb24iOnsiaWQiOiIwMjZlOGM3Mi03OTQ0LTRkY2QtODY2OC1mNTk2NDQ3ZmVjNmQiLCJyb2xlcyI6W3sicGFydHlSb2xlIjoiTUFOQUdFUiIsInJvbGUiOiJhZG1pbiJ9XSwiZ3JvdXBzIjpbIjYyZTk0MWQzMTNiMGZjNmVkYWQ0NTM1YSJdLCJmaXNjYWxfY29kZSI6IjAxMTk5MjUwMTU4In19.JC5MH_ypJ-PD96c33qvES5RlrvKVY5aJkRUHdGWfDwo"
      )
    ).to.be.rejectedWith(ValidationException, "Invalid algorithm");
  });

  it("test the token validation - not allowed audience", async () => {
    await expect(
      validator.validation(
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY0OTY4Njc0OSwiZXhwIjoxNjQ5NjkwMzQ5LCJhdWQiOiJwb3J0YWxlLWZha2UtZGV2ZWxvcC5mZS5kZXYucG4ucGFnb3BhLml0IiwiaXNzIjoiaHR0cHM6Ly9zcGlkLWh1Yi10ZXN0LmRldi5wbi5wYWdvcGEuaXQiLCJqdGkiOiIwMUcwQ0ZXODBIR1RUVzBSSDU0V1FENkY2UyIsIm9yZ2FuaXphdGlvbiI6eyJpZCI6IjAyNmU4YzcyLTc5NDQtNGRjZC04NjY4LWY1OTY0NDdmZWM2ZCIsInJvbGVzIjpbeyJwYXJ0eVJvbGUiOiJNQU5BR0VSIiwicm9sZSI6ImFkbWluIn1dLCJncm91cHMiOlsiNjJlOTQxZDMxM2IwZmM2ZWRhZDQ1MzVhIl0sImZpc2NhbF9jb2RlIjoiMDExOTkyNTAxNTgifX0.eVmMtNncwxo77nOYhw8TtkPvm_LoKQXyXRgR7v_G8LzLHAl7WYay3Fb4wPWqhOJaK5K9zCDfi23sEvFuAYK1klvyRujjNYB7lvYM7zTzsSY6EOn-Y578TMalBh-3mw8m_Eqf7jsj4bkJjFNRE8BwmdJTCvY_kEymJKocx9nDoNe2Lf67RQS25OAYlOsem2nKLnbFkmjsZnxDgo47f0knRgSXI6oQrwE9klR_x6348cJFDxCGaKU2kgupRHG1UgqaxCHOMzea8muQYdIvhdtuAkh_xDrEqbSDZU_jgiH9Xha-R7Rl4I4KnxsUHO6Oq-ybI42DO9OgezbbE6b4B0EZ8w"
      )
    ).to.be.rejectedWith(ValidationException, "Invalid Audience");
  });

  it("test the token validation - not allowed issuer", async () => {
    await expect(
      validator.validation(
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY0OTY4Njc0OSwiZXhwIjoxNjQ5NjkwMzQ5LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItZmFrZS5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMENGVzgwSEdUVFcwUkg1NFdRRDZGNlMiLCJvcmdhbml6YXRpb24iOnsiaWQiOiIwMjZlOGM3Mi03OTQ0LTRkY2QtODY2OC1mNTk2NDQ3ZmVjNmQiLCJyb2xlcyI6W3sicGFydHlSb2xlIjoiTUFOQUdFUiIsInJvbGUiOiJhZG1pbiJ9XSwiZ3JvdXBzIjpbIjYyZTk0MWQzMTNiMGZjNmVkYWQ0NTM1YSJdLCJmaXNjYWxfY29kZSI6IjAxMTk5MjUwMTU4In19.rhfzWKkziL2nuI97xLBkorn6dKy-gxILQkDJqmcd5PMxiU4hsV_IVBAxaovlCGFxkI6sIXrF-d3sTd0E7ymS-lVUBnQs3pRz6U97RCSyP-F9TjqKo_vUZ8a-Nxj6XFomiPf1vz8aUn6Nbuu8Y8t-rML74c-X0kWLdHC8HUWKUAJ6hh2SkAbpwmt7VG88B52tcjFDEo6NKw-lE_Qm_fnAZxNzV32UaZBjuekzVY4WH15K4UdAd5ZGIq2bo7-Lg2s7cGo4F5nEekc6zN7cI7x_Ph1ueN74prekwLw1WqRnhrQHeEwrPy20OWlWUyLYpZbqY6GAnaBwvE-Hc4ceB_h6HA"
      )
    ).to.be.rejectedWith(ValidationException, "Issuer not known");
  });

  it("test the token validation - not allowed role", async () => {
    await expect(
      validator.validation(
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY0OTY4Njc0OSwiZXhwIjoxNjQ5NjkwMzQ5LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMENGVzgwSEdUVFcwUkg1NFdRRDZGNlMiLCJvcmdhbml6YXRpb24iOnsiaWQiOiIwMjZlOGM3Mi03OTQ0LTRkY2QtODY2OC1mNTk2NDQ3ZmVjNmQiLCJyb2xlcyI6W3sicGFydHlSb2xlIjoiTUFOQUdFUiIsInJvbGUiOiJmYWtlLWFkbWluIn1dLCJncm91cHMiOlsiNjJlOTQxZDMxM2IwZmM2ZWRhZDQ1MzVhIl0sImZpc2NhbF9jb2RlIjoiMDExOTkyNTAxNTgifX0.Rbu2QjJubrR2251nW2Y5DMDg409gLQkj6m0L21nftKO5irCt0jpnQYlk1tdfx7WtEwbYkDeyp0e8j0jOBIEiBeZOW_9cJ8ftFETBGhH7d5s-vrY8Sap4sZaXDWFPV2WR8WdTheQV9Co3bzvcsQRAewuyyHC2tHE9gn0C5eczTU5DWTpp-TBEA_omMzUBjfNHcoMCoUmJUJchqbhvqgYrAOCRuhT2Twqzs9ffdmPiukTkcjnw-oE25av49y90JJzSSSF4d6cSMJFBTgZfMQo6FCqXKFtm9SZWGVqAub3DzzBSSkdCQYDouaElqtV-n8U-7jAD7Jl9oWEsWP9h7y0g1Q"
      )
    ).to.be.rejectedWith(ValidationException, "Role not allowed");
  });

  it("test the token validation - no parameter path defined", async () => {
    const stub = sinon.stub(process.env, 'ALLOWED_TAXIDS_PARAMETER').value('');
    const tokenPayload = await validator.validation(
      "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEEiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY0OTY4Njc0OSwiZXhwIjoxNjQ5NjkwMzQ5LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMENGVzgwSEdUVFcwUkg1NFdRRDZGNlMiLCJvcmdhbml6YXRpb24iOnsiaWQiOiIwMjZlOGM3Mi03OTQ0LTRkY2QtODY2OC1mNTk2NDQ3ZmVjNmQiLCJyb2xlcyI6W3sicGFydHlSb2xlIjoiTUFOQUdFUiIsInJvbGUiOiJhZG1pbiJ9XSwiZ3JvdXBzIjpbIjYyZTk0MWQzMTNiMGZjNmVkYWQ0NTM1YSJdLCJmaXNjYWxfY29kZSI6IjAxMTk5MjUwMTU4In19.PrlZTKA21sSOF3mh3TKziXfDgxSZJBPzWWqtbI_5wWVo3C0MT6ZdemOGw8OKYxmMvWpkIwJjTJ4zf2plAqxAaO52olY5zbbrOES5zo2AkwURVHVgnJw6CihSGqrtfB2bgmLUYo1yI-qZRwauDOqa4KyZs9R1fNJFSbDBZUaD8Id7-bNH4i599b_cdBRnrrJSMjNwViyD_s3Eu98LxgoJoQDKCfbQlR90-cnG61S_-zNQkDqEztsePa45GpthpCh9wCDgCmLWfXlwfXXp7P-q_LRO_AWWJx203VFl9rtXXih5VV0AYdPFEJdR9dXHzcuA2tdKStB6EwBj7DXzqqVECQ"
    );
    expect(tokenPayload).to.be.eql({
      ...decodedToken,
      fiscal_number: "GDNNWA12H81Y874A",
    });
    stub.reset();
    stub.restore();
  });

  it("test the token validation - not allowed taxId (not present in list)", async () => {
    mockGetTaxIdFromStore("GDNNWA12H81Y874F");
    await expect(
      validator.validation(
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEEiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY0OTY4Njc0OSwiZXhwIjoxNjQ5NjkwMzQ5LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMENGVzgwSEdUVFcwUkg1NFdRRDZGNlMiLCJvcmdhbml6YXRpb24iOnsiaWQiOiIwMjZlOGM3Mi03OTQ0LTRkY2QtODY2OC1mNTk2NDQ3ZmVjNmQiLCJyb2xlcyI6W3sicGFydHlSb2xlIjoiTUFOQUdFUiIsInJvbGUiOiJhZG1pbiJ9XSwiZ3JvdXBzIjpbIjYyZTk0MWQzMTNiMGZjNmVkYWQ0NTM1YSJdLCJmaXNjYWxfY29kZSI6IjAxMTk5MjUwMTU4In19.PrlZTKA21sSOF3mh3TKziXfDgxSZJBPzWWqtbI_5wWVo3C0MT6ZdemOGw8OKYxmMvWpkIwJjTJ4zf2plAqxAaO52olY5zbbrOES5zo2AkwURVHVgnJw6CihSGqrtfB2bgmLUYo1yI-qZRwauDOqa4KyZs9R1fNJFSbDBZUaD8Id7-bNH4i599b_cdBRnrrJSMjNwViyD_s3Eu98LxgoJoQDKCfbQlR90-cnG61S_-zNQkDqEztsePa45GpthpCh9wCDgCmLWfXlwfXXp7P-q_LRO_AWWJx203VFl9rtXXih5VV0AYdPFEJdR9dXHzcuA2tdKStB6EwBj7DXzqqVECQ"
      )
    ).to.be.rejectedWith(ValidationException, "TaxId not allowed");
  });

  it("test the token validation - not allowed taxId (negated)", async () => {
    mockGetTaxIdFromStore("*,!GDNNWA12H81Y874A");
    await expect(
      validator.validation(
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEEiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY0OTY4Njc0OSwiZXhwIjoxNjQ5NjkwMzQ5LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMENGVzgwSEdUVFcwUkg1NFdRRDZGNlMiLCJvcmdhbml6YXRpb24iOnsiaWQiOiIwMjZlOGM3Mi03OTQ0LTRkY2QtODY2OC1mNTk2NDQ3ZmVjNmQiLCJyb2xlcyI6W3sicGFydHlSb2xlIjoiTUFOQUdFUiIsInJvbGUiOiJhZG1pbiJ9XSwiZ3JvdXBzIjpbIjYyZTk0MWQzMTNiMGZjNmVkYWQ0NTM1YSJdLCJmaXNjYWxfY29kZSI6IjAxMTk5MjUwMTU4In19.PrlZTKA21sSOF3mh3TKziXfDgxSZJBPzWWqtbI_5wWVo3C0MT6ZdemOGw8OKYxmMvWpkIwJjTJ4zf2plAqxAaO52olY5zbbrOES5zo2AkwURVHVgnJw6CihSGqrtfB2bgmLUYo1yI-qZRwauDOqa4KyZs9R1fNJFSbDBZUaD8Id7-bNH4i599b_cdBRnrrJSMjNwViyD_s3Eu98LxgoJoQDKCfbQlR90-cnG61S_-zNQkDqEztsePa45GpthpCh9wCDgCmLWfXlwfXXp7P-q_LRO_AWWJx203VFl9rtXXih5VV0AYdPFEJdR9dXHzcuA2tdKStB6EwBj7DXzqqVECQ"
      )
    ).to.be.rejectedWith(ValidationException, "TaxId not allowed");
  });

  it("test the token validation - allowed taxId (empty)", async () => {
    mockGetTaxIdFromStore("");
    const tokenPayload = await validator.validation(
      "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEEiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY0OTY4Njc0OSwiZXhwIjoxNjQ5NjkwMzQ5LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMENGVzgwSEdUVFcwUkg1NFdRRDZGNlMiLCJvcmdhbml6YXRpb24iOnsiaWQiOiIwMjZlOGM3Mi03OTQ0LTRkY2QtODY2OC1mNTk2NDQ3ZmVjNmQiLCJyb2xlcyI6W3sicGFydHlSb2xlIjoiTUFOQUdFUiIsInJvbGUiOiJhZG1pbiJ9XSwiZ3JvdXBzIjpbIjYyZTk0MWQzMTNiMGZjNmVkYWQ0NTM1YSJdLCJmaXNjYWxfY29kZSI6IjAxMTk5MjUwMTU4In19.PrlZTKA21sSOF3mh3TKziXfDgxSZJBPzWWqtbI_5wWVo3C0MT6ZdemOGw8OKYxmMvWpkIwJjTJ4zf2plAqxAaO52olY5zbbrOES5zo2AkwURVHVgnJw6CihSGqrtfB2bgmLUYo1yI-qZRwauDOqa4KyZs9R1fNJFSbDBZUaD8Id7-bNH4i599b_cdBRnrrJSMjNwViyD_s3Eu98LxgoJoQDKCfbQlR90-cnG61S_-zNQkDqEztsePa45GpthpCh9wCDgCmLWfXlwfXXp7P-q_LRO_AWWJx203VFl9rtXXih5VV0AYdPFEJdR9dXHzcuA2tdKStB6EwBj7DXzqqVECQ"
    );
    expect(tokenPayload).to.be.eql({
      ...decodedToken,
      fiscal_number: "GDNNWA12H81Y874A",
    });
  });

  it("test the token validation - allowed taxId (wildcard)", async () => {
    mockGetTaxIdFromStore("*");
    const tokenPayload = await validator.validation(
      "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEEiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY0OTY4Njc0OSwiZXhwIjoxNjQ5NjkwMzQ5LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMENGVzgwSEdUVFcwUkg1NFdRRDZGNlMiLCJvcmdhbml6YXRpb24iOnsiaWQiOiIwMjZlOGM3Mi03OTQ0LTRkY2QtODY2OC1mNTk2NDQ3ZmVjNmQiLCJyb2xlcyI6W3sicGFydHlSb2xlIjoiTUFOQUdFUiIsInJvbGUiOiJhZG1pbiJ9XSwiZ3JvdXBzIjpbIjYyZTk0MWQzMTNiMGZjNmVkYWQ0NTM1YSJdLCJmaXNjYWxfY29kZSI6IjAxMTk5MjUwMTU4In19.PrlZTKA21sSOF3mh3TKziXfDgxSZJBPzWWqtbI_5wWVo3C0MT6ZdemOGw8OKYxmMvWpkIwJjTJ4zf2plAqxAaO52olY5zbbrOES5zo2AkwURVHVgnJw6CihSGqrtfB2bgmLUYo1yI-qZRwauDOqa4KyZs9R1fNJFSbDBZUaD8Id7-bNH4i599b_cdBRnrrJSMjNwViyD_s3Eu98LxgoJoQDKCfbQlR90-cnG61S_-zNQkDqEztsePa45GpthpCh9wCDgCmLWfXlwfXXp7P-q_LRO_AWWJx203VFl9rtXXih5VV0AYdPFEJdR9dXHzcuA2tdKStB6EwBj7DXzqqVECQ"
    );
    expect(tokenPayload).to.be.eql({
      ...decodedToken,
      fiscal_number: "GDNNWA12H81Y874A",
    });
  });

  it("test the token validation", async () => {
    mockGetTaxIdFromStore("GDNNWA12H81Y874F");
    const tokenPayload = await validator.validation(
      "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY0OTY4Njc0OSwiZXhwIjoxNjQ5NjkwMzQ5LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMENGVzgwSEdUVFcwUkg1NFdRRDZGNlMiLCJvcmdhbml6YXRpb24iOnsiaWQiOiIwMjZlOGM3Mi03OTQ0LTRkY2QtODY2OC1mNTk2NDQ3ZmVjNmQiLCJyb2xlcyI6W3sicGFydHlSb2xlIjoiTUFOQUdFUiIsInJvbGUiOiJhZG1pbiJ9XSwiZ3JvdXBzIjpbIjYyZTk0MWQzMTNiMGZjNmVkYWQ0NTM1YSJdLCJmaXNjYWxfY29kZSI6IjAxMTk5MjUwMTU4In19.kNdfWLhZTxust5GOjTXoh03G9Px5KGOri9w6gV2xFc2FftjjguNZV2FxtkBKrzKmjH8BHQTpRO0hJV3uCb8zW_VHW3hbqwDQjw5MGYOMeAmR5xmlkVfF0Xd_7eaAPQv8VevceYypkMaq0UBzQR1SkBYKPj0Dn9ga52WAsJ-2P5cLSzSA52nVkISvAaAqOLg1-eoiVLv8KGw_STKctHq60SuQFa9vmXTDHblebR30SN9vFv0AJEj0oaw_pTWRjG3wW2pVJwhLrefwhS00n8E04649hTkcUPa9JxVBDwFgcDTJyii2KBSAJ0kmi7IO20VBiESmaeZQSpsH4JpkMnjyIIO9jjIkicssfW0HeAcJLZUfCo21lZcXh9kzxAXCrZ_rK09RUew7hZwP3Xpt4X-4DS1YzXfwl4So5ayDv38zsOocT10EJEEKQg8UOCSXzh8_-MgMsukU6fgdXny3epvLKq0aahtP3vqSbl9wZd5aPPEklU08PS-bWifw2Qa8gozzSR-MOPGTdLun5230Z1MQJmyJXy_HJuLIKeKMMfCAinhR5476xBE2bpC_gjvPcr7LGfUYTI6ZRLDFf96Muf48hq0bGWZzT2nxOBs5WpWQcOvPw3XIgQ8Th9wWSOWiSakpyT-AIpbj7K83Z-HkHIUwqzgbtApRPNhnlzaMrRELqF0"
    );
    expect(tokenPayload).to.be.eql(decodedToken);
  });
});
