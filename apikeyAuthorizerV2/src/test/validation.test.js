const chaiAsPromised = require("chai-as-promised");
const chai = require("chai");
const jsonwebtoken = require("jsonwebtoken");
const sinon = require("sinon");
const rewire = require("rewire");
const fs = require("fs");

chai.use(chaiAsPromised);
const expect = chai.expect;

const validator = rewire("../app/validation");
const retrieverPdndJwks = require("../app/retrieverPdndJwks");
const ValidationException = require("../app/exceptions");
const AudienceValidationException = require("../app/exceptions");

const decodedToken = {
    aud: "https://api.dev.pn.pagopa.it",
    sub: "bd5ecb78-e1d4-4322-921c-6fe0eaa427d5",
    nbf: 1681215060,
    purposeId: "20999a0f-ec40-41c7-9fdd-9d3ad079ad81",
    iss: "uat.interop.pagopa.it",
    exp: 1681218660,
    iat: 1681215060,
    client_id: "bd5ecb78-e1d4-4322-921c-6fe0eaa427d5",
    jti: "651b205c-e76e-44d3-b028-45a99ae46e17"
};

describe("test validation", () => {
  beforeEach(() => {
    process.env.PDND_ISSUER = "uat.interop.pagopa.it"
    process.env.PDND_AUDIENCE = "https://api.dev.pn.pagopa.it"
    sinon.stub(retrieverPdndJwks, "getJwks").callsFake((issuer) => {
      const result = fs.readFileSync(
        "./src/test/jwks-mock/interop-pagopa-jwks.json",
        { encoding: "utf8" }
      );
      return JSON.parse(result);
    });
  });

  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  it("test the token validation - token null", async () => {
    await expect(validator.validation(null)).to.be.rejectedWith(
      ValidationException,
      "token is not valid"
    );
  });

  it("test the token validation - Invalid token Type", async () => {
    await expect(
      validator.validation(
          "eyJhbGciOiJSUzI1NiIsInR5cCI6ImludmFsaWQiLCJ1c2UiOiJzaWciLCJraWQiOiIzMmQ4YTMyMS0xNTY4LTQ0ZjUtOTU1OC1hOTA3MmY1MTlkMmQifQ.eyJhdWQiOiJodHRwczovL2FwaS5kZXYucG4ucGFnb3BhLml0Iiwic3ViIjoiYmQ1ZWNiNzgtZTFkNC00MzIyLTkyMWMtNmZlMGVhYTQyN2Q1IiwibmJmIjoxNjgxMjE1MDYwLCJwdXJwb3NlSWQiOiIyMDk5OWEwZi1lYzQwLTQxYzctOWZkZC05ZDNhZDA3OWFkODEiLCJpc3MiOiJ1YXQuaW50ZXJvcC5wYWdvcGEuaXQiLCJleHAiOjE2ODEyMTg2NjAsImlhdCI6MTY4MTIxNTA2MCwiY2xpZW50X2lkIjoiYmQ1ZWNiNzgtZTFkNC00MzIyLTkyMWMtNmZlMGVhYTQyN2Q1IiwianRpIjoiNjUxYjIwNWMtZTc2ZS00NGQzLWIwMjgtNDVhOTlhZTQ2ZTE3In0.KgdXraVGOmAsmuy7erbUewUhfN_CNEnyj4i5-LBvOG_ep7J-XpliaEudjg_KsBANu8_9bP3qnwIHXLjUa0hkRQld_fCVna-siGjolBPA-TY_C5zKOgKzU-Ac6T-lwDI11Y7w4sdjBG1TOyWwdj1ovrYyvHpOUyfpbFlCqQlGIDmzhllasinRvd9xkrvu9siChw-wbm8BS1tJqs7Y85DOU25rYbVGVuAWQOr_15idnZDtEb_ff8rvFPGGwyNHq6IES2OkSM1WM9PeJdv1qgG80r418AwAHy4h6KDR7S4q4fsnYgus5t3Sxh51U3R2WvxU-yXvJtOLR_h1ZUgv2q35Hg"
        )
    ).to.be.rejectedWith(ValidationException, "Invalid token Type");
  });

  it("test the token validation - Invalid token Issuer", async () => {
    await expect(
      validator.validation(
        "eyJhbGciOiJSUzI1NiIsInR5cCI6ImF0K2p3dCIsInVzZSI6InNpZyIsImtpZCI6IjMyZDhhMzIxLTE1NjgtNDRmNS05NTU4LWE5MDcyZjUxOWQyZCJ9.eyJhdWQiOiJodHRwczovL2FwaS5kZXYucG4ucGFnb3BhLml0Iiwic3ViIjoiYmQ1ZWNiNzgtZTFkNC00MzIyLTkyMWMtNmZlMGVhYTQyN2Q1IiwibmJmIjoxNjgxMjE1MDYwLCJwdXJwb3NlSWQiOiIyMDk5OWEwZi1lYzQwLTQxYzctOWZkZC05ZDNhZDA3OWFkODEiLCJpc3MiOiJpbnZhbGlkIiwiZXhwIjoxNjgxMjE4NjYwLCJpYXQiOjE2ODEyMTUwNjAsImNsaWVudF9pZCI6ImJkNWVjYjc4LWUxZDQtNDMyMi05MjFjLTZmZTBlYWE0MjdkNSIsImp0aSI6IjY1MWIyMDVjLWU3NmUtNDRkMy1iMDI4LTQ1YTk5YWU0NmUxNyJ9.dNJ5-4gn03Yo4RdMEqAF7kgZMWgskwpdiWxTLomHA-ce0ReTuhon-3bgbJf-SYqShu99YPBempfzj-zXwOL4YkQOKe4Y45Y7EtzEsoFXJJu9O_jyJhKbNjZet-bpkICI9SzGTDUr5r8ww_tVlmo8XR-VrYSZEa67gi7i6zB2zIJyU1PYvnmSCFG9fr1EZU3GjnaMpaCR1uz678sn2OJQFxNz8oomnwy9UpJ6N67Glomi1FvBIABpEXqO2EHVjSYMw1DbbW6WDFY8pFl_XLpcXy5hMC3Q82l_-cLlmToWxlNdHtm_ooIF0mJDg-UOTgVJjnZbf29XXBrkYKAbBI5aKw"
      )
    ).to.be.rejectedWith(ValidationException, "Invalid token Issuer");
  });

  it("test the token validation - Invalid token audience", async () => {
    await expect(
      validator.validation(
        "eyJhbGciOiAiUlMyNTYiLCJ0eXAiOiAiYXQrand0IiwgInVzZSI6ICJzaWciLCJraWQiOiAiYWFmZDRmOWUtNGFiYy00OTA4LTg3MzEtYmY0ZWE4YjZlMDhhIn0.eyJpYXQiOiAxNjg5MjYwNDU1LCJleHAiOiAxNzIwODgyODU1LCAidWlkIjogImJkNWVjYjc4LWUxZDQtNDMyMi05MjFjLTZmZTBlYWE0MjdkNSIsImlzcyI6ICJ1YXQuaW50ZXJvcC5wYWdvcGEuaXQiLCJhdWQiOiAiaHR0cHM6Ly9hdWRpZW5jZS5pbnZhbGlkby5pdCJ9.b-TWVlAZB9r8dQGUgjSrU5G0pBDmkrdD9lK6TWz-ndRkHSQVd_kgKqkLWpScARAjXTniuwvcutloqQsSZPQnZXkTQLRlsEcSy318gY3WcUEG6qeQlomFLL8CorFhbvErgeV8uB882jENL_m6S-erQZ7i8JFp7Dxpnb_omNk3T7eBhFhbPUrYB0W-sdU3EG7CqYRldKqyKpZiF-W6N76gd6XTscjr4UM3PpvPDnb0R0Ky_49pFhYIDvi6HNJOSibjVhCGOXUROGggAAIZVMw7AzyvCEHkOJDRV0lmDicopvS4Or7KhDDMIi1f7j616zzt2KDX4u2Me9I7efJmEC0YXA"
      )
    ).to.be.rejectedWith(AudienceValidationException, "Invalid token Audience");
  });

  it("test the token validation", async () => {
    sinon.stub(jsonwebtoken, "verify").returns("token.token.token");
    const tokenPayload = await validator.validation(
        "eyJ0eXAiOiJhdCtqd3QiLCJhbGciOiJSUzI1NiIsInVzZSI6InNpZyIsImtpZCI6IjMyZDhhMzIxLTE1NjgtNDRmNS05NTU4LWE5MDcyZjUxOWQyZCJ9.eyJhdWQiOiJodHRwczovL2FwaS5kZXYucG4ucGFnb3BhLml0Iiwic3ViIjoiYmQ1ZWNiNzgtZTFkNC00MzIyLTkyMWMtNmZlMGVhYTQyN2Q1IiwibmJmIjoxNjgxMjE1MDYwLCJwdXJwb3NlSWQiOiIyMDk5OWEwZi1lYzQwLTQxYzctOWZkZC05ZDNhZDA3OWFkODEiLCJpc3MiOiJ1YXQuaW50ZXJvcC5wYWdvcGEuaXQiLCJleHAiOjE2ODEyMTg2NjAsImlhdCI6MTY4MTIxNTA2MCwiY2xpZW50X2lkIjoiYmQ1ZWNiNzgtZTFkNC00MzIyLTkyMWMtNmZlMGVhYTQyN2Q1IiwianRpIjoiNjUxYjIwNWMtZTc2ZS00NGQzLWIwMjgtNDVhOTlhZTQ2ZTE3In0.27kvqi7P7dXFp7m8o7Eu_uuoZIAP4zMkeNQbp1S-cmwGe4ceVBz3N-172YizmUeMTsg4DwRGdUegGQdc_wlXOUO445r3-nf-qNu01SafAYD0d9rpCkqno3vm5Bd2OksDexH8H4X97A2Ygp_YI9qrnlcCKjmYK0Qa6zoKGqptL_-Oxe7CzSuTpDI2TTXBgCNg90gfnHkzxz3RUNMaZ3xf3p-BNUt4-kWd7jGdnvualV1yNdBNUcviylWHfxbDR-v0zdrmvr-aVZYb-SX0WVLAQwiAX_0EzCnpzDEoncV_1bB_jhJHNSjdO_-LRnF6K3SxUuSsaYon7HkP3A_JkFq8GQ"
    );
    expect(tokenPayload).to.be.eql(decodedToken);
  });

  it("test the token validation - Verify Token exception", async () => {
    sinon.stub(jsonwebtoken, "verify").throws();
    await expect(
      validator.validation(
        "eyJ0eXAiOiJhdCtqd3QiLCJhbGciOiJSUzI1NiIsInVzZSI6InNpZyIsImtpZCI6IjMyZDhhMzIxLTE1NjgtNDRmNS05NTU4LWE5MDcyZjUxOWQyZCJ9.eyJhdWQiOiJodHRwczovL2FwaS5kZXYucG4ucGFnb3BhLml0Iiwic3ViIjoiYmQ1ZWNiNzgtZTFkNC00MzIyLTkyMWMtNmZlMGVhYTQyN2Q1IiwibmJmIjoxNjgxMjE1MDYwLCJwdXJwb3NlSWQiOiIyMDk5OWEwZi1lYzQwLTQxYzctOWZkZC05ZDNhZDA3OWFkODEiLCJpc3MiOiJ1YXQuaW50ZXJvcC5wYWdvcGEuaXQiLCJleHAiOjE2ODEyMTg2NjAsImlhdCI6MTY4MTIxNTA2MCwiY2xpZW50X2lkIjoiYmQ1ZWNiNzgtZTFkNC00MzIyLTkyMWMtNmZlMGVhYTQyN2Q1IiwianRpIjoiNjUxYjIwNWMtZTc2ZS00NGQzLWIwMjgtNDVhOTlhZTQ2ZTE3In0.27kvqi7P7dXFp7m8o7Eu_uuoZIAP4zMkeNQbp1S-cmwGe4ceVBz3N-172YizmUeMTsg4DwRGdUegGQdc_wlXOUO445r3-nf-qNu01SafAYD0d9rpCkqno3vm5Bd2OksDexH8H4X97A2Ygp_YI9qrnlcCKjmYK0Qa6zoKGqptL_-Oxe7CzSuTpDI2TTXBgCNg90gfnHkzxz3RUNMaZ3xf3p-BNUt4-kWd7jGdnvualV1yNdBNUcviylWHfxbDR-v0zdrmvr-aVZYb-SX0WVLAQwiAX_0EzCnpzDEoncV_1bB_jhJHNSjdO_-LRnF6K3SxUuSsaYon7HkP3A_JkFq8GQ"
      )
    ).to.be.rejectedWith(ValidationException, "Error");
  });

})
