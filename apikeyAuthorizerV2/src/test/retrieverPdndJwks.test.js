const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");
const fs = require("fs");

const { getJwks } = require("../app/retrieverPdndJwks.js");

describe("retrieverJwks success", () => {
  const result = fs.readFileSync(
    "./src/test/jwks-mock/interop-pagopa-jwks.json",
    { encoding: "utf8" }
  );
  const jsonResult = JSON.parse(result);
  const mock = new MockAdapter(axios);
  mock
    .onGet("https://dev.interop.pagopa.it/.well-known/jwks.json")
    .reply(200, jsonResult);

  getJwks("dev.interop.pagopa.it").then(function (response) {
    console.log(response);
  });
});

describe("retrieverJwks error", () => {
  fs.readFileSync("./src/test/jwks-mock/interop-pagopa-jwks.json", {
    encoding: "utf8",
  });
  const mock = new MockAdapter(axios);
  mock.onGet("https://dev.interop.pagopa.it/.well-known/jwks.json").reply(500);

  getJwks("dev.interop.pagopa.it").then(function (response) {
    console.log(response);
  });
});
