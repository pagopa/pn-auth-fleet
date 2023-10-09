import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import fs from "fs";
import { getJwks } from "../app/retrieverJwks.js";

describe("retrieverJwks success", () => {
  const result = fs.readFileSync(
    "./src/test/jwks-mock/spid-hub-test.dev.pn.pagopa.it.jwks.json",
    { encoding: "utf8" }
  );
  const jsonResult = JSON.parse(result);
  const mock = new MockAdapter(axios);
  mock
    .onGet("https://spid-hub-test.dev.pn.pagopa.it:8080/.well-known/jwks.json")
    .reply(200, jsonResult);

  getJwks("https://spid-hub-test.dev.pn.pagopa.it:8080").then(function (
    response
  ) {
    console.log(response);
  });
});

describe("retrieverJwks error", () => {
  fs.readFileSync(
    "./src/test/jwks-mock/spid-hub-test.dev.pn.pagopa.it.jwks.json",
    { encoding: "utf8" }
  );
  const mock = new MockAdapter(axios);
  mock
    .onGet("https://spid-hub-test.dev.pn.pagopa.it:8080/.well-known/jwks.json")
    .reply(500);

  getJwks("https://spid-hub-test.dev.pn.pagopa.it:8080").then(function (
    response
  ) {
    console.log(response);
  });
});
