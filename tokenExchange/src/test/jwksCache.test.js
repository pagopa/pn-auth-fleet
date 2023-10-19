const sinon = require("sinon");
const fs = require("fs");
const chaiAsPromised = require("chai-as-promised");
const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");
const chai = require("chai");

const { get, isCacheActive } = require("../app/jwksCache.js");

chai.use(chaiAsPromised);
const expect = chai.expect;
const SIX_MINUTES_IN_MS = 360000;

describe("test jwksCache", () => {
  const jwksFromSelc = JSON.parse(
    fs.readFileSync("./src/test/jwks-mock/api.selfcare.pagopa.it.jwks.json", {
      encoding: "utf8",
    })
  );
  let mock;
  let clock;

  before(() => {
    mock = new MockAdapter(axios);
    clock = sinon.useFakeTimers();
    process.env.CACHE_TTL = "300";
  });

  afterEach(() => {
    mock.reset();
  });

  after(() => {
    mock.restore();
    sinon.restore();
    clock.restore();
  });

  it("initialize cache when is empty", async () => {
    mock
      .onGet("https://uat.selfcare.pagopa.it/.well-known/jwks.json")
      .reply(200, jwksFromSelc);

    const jwks = await get("api.selfcare.pagopa.it");
    const cacheActive = isCacheActive();
    expect(jwks.keys).to.be.eql(jwksFromSelc.keys);
    expect(jwks.expiresOn).not.to.be.undefined;
    expect(jwks.lastUpdate).not.to.be.undefined;
    expect(cacheActive).to.be.true;
  });

  it("error initializing cache", async () => {
    // First call fails
    mock
      .onGet("https://uat.selfcare.pagopa.it/.well-known/jwks.json")
      .reply(500);

    expect(get).throws;
  });

  it("error refreshing cache", async () => {
    // First call succeed
    mock
      .onGet("https://uat.selfcare.pagopa.it/.well-known/jwks.json")
      .reply(200, jwksFromSelc);

    const jwks = await get("api.selfcare.pagopa.it");
    const firstExpiresOn = jwks.expiresOn;
    expect(jwks.keys).to.be.eql(jwksFromSelc.keys);
    expect(firstExpiresOn).not.to.be.undefined;
    expect(jwks.lastUpdate).not.to.be.undefined;

    // advance time to simulate expiration
    clock.tick(SIX_MINUTES_IN_MS);

    // Second call fails
    mock
      .onGet("https://uat.selfcare.pagopa.it/.well-known/jwks.json")
      .reply(500);

    // Check expiration
    const now = Date.now();
    const isCacheExpired = firstExpiresOn < now * 1000;
    expect(isCacheExpired).to.be.true;

    // Obtain old cache value
    const secondJwks = await get("api.selfcare.pagopa.it");
    const secondExpiresOn = secondJwks.expiresOn;
    expect(firstExpiresOn).to.be.eql(secondExpiresOn);
  });
});
