const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");
const fs = require("fs");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");

const { getJwks } = require("../app/retrieverJwks.js");

chai.use(chaiAsPromised);
const expect = chai.expect;

describe("retrieverJwks", () => {
  let mock;

  before(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.reset();
  });

  after(() => {
    mock.restore();
  });

  it("success", async () => {
    const result = fs.readFileSync(
      "./src/test/jwks-mock/spid-hub-test.dev.pn.pagopa.it.jwks.json",
      { encoding: "utf8" }
    );
    const jsonResult = JSON.parse(result);
    mock
      .onGet(
        "https://spid-hub-test.dev.pn.pagopa.it:8080/.well-known/jwks.json"
      )
      .reply(200, jsonResult);

    const response = await getJwks(
      "https://spid-hub-test.dev.pn.pagopa.it:8080"
    );
    expect(response).to.be.eq(response);
  });

  it("error", async () => {
    mock
      .onGet(
        "https://spid-hub-test.dev.pn.pagopa.it:8080/.well-known/jwks.json"
      )
      .reply(500);

    await expect(
      getJwks("https://spid-hub-test.dev.pn.pagopa.it:8080")
    ).to.be.rejectedWith(Error, "Error in get pub key");
  });
});
