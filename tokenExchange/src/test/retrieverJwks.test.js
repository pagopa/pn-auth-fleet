const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");
const fs = require("fs");
const { getJwks } = require("../app/retrieverJwks.js");

describe("retrieverJwks success", () => {
  const mock = new MockAdapter(axios);

  afterEach(() => {
    mock.reset();
  });

  after(() => {
    mock.restore();
  });

  it("success", () => {
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

    getJwks("https://spid-hub-test.dev.pn.pagopa.it:8080").then(function (
      response
    ) {
      console.log(response);
    });
  });

  it("error", () => {
    mock
      .onGet(
        "https://spid-hub-test.dev.pn.pagopa.it:8080/.well-known/jwks.json"
      )
      .reply(500);

    getJwks("https://spid-hub-test.dev.pn.pagopa.it:8080").then(function (
      response
    ) {
      console.log(response);
    });
  });
});
