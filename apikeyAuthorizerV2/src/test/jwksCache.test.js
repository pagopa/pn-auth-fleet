const sinon = require("sinon");
const fs = require("fs");
const chaiAsPromised = require("chai-as-promised");
const chai = require("chai");
const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");

const { get, isCacheActive } = require("../app/jwksCache");

chai.use(chaiAsPromised);
const expect = chai.expect;
const SIX_MINUTES_IN_MS = 360000;

describe("test jwksCache", () => {
  const jwksFromPdnd = JSON.parse(
    fs.readFileSync("./src/test/jwks-mock/interop-pagopa-jwks.json", {
      encoding: "utf8",
    })
  );
  let mock;
  let clock;

  before(() => {
    mock = new MockAdapter(axios);
    clock = sinon.useFakeTimers({ now: Date.now(), shouldAdvanceTime: true });
    sinon.stub(process, "env").value({
      PDND_ISSUER: "uat.interop.pagopa.it",
      PDND_AUDIENCE: "https://api.dev.pn.pagopa.it",
      CACHE_TTL: "300",
    });
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
      .onGet("https://uat.interop.pagopa.it/.well-known/jwks.json")
      .reply(200, jwksFromPdnd);

    const jwks = await get();
    expect(jwks.keys).to.be.eql(jwksFromPdnd.keys);
    expect(jwks.expiresOn).not.to.be.undefined;
    expect(jwks.lastUpdate).not.to.be.undefined;
    expect(isCacheActive()).to.be.true;
  });

  it("refresh cache when is expired", async () => {
    mock
      .onGet("https://uat.interop.pagopa.it/.well-known/jwks.json")
      .reply(200, jwksFromPdnd);

    const jwks = await get();
    const firstExpiresOn = jwks.expiresOn;
    expect(jwks.keys).to.be.eql(jwksFromPdnd.keys);
    expect(firstExpiresOn).not.to.be.undefined;
    expect(jwks.lastUpdate).not.to.be.undefined;

    clock.tick(SIX_MINUTES_IN_MS);

    const now = Date.now();
    const isCacheExpired = firstExpiresOn < now;
    expect(isCacheExpired).to.be.true;

    const newJwks = await get();
    const secondExpiresOn = newJwks.expiresOn;
    expect(firstExpiresOn).to.be.lessThan(secondExpiresOn);
  });

  it("error initializing cache", async () => {
    //First call fails
    mock
      .onGet("https://uat.interop.pagopa.it/.well-known/jwks.json")
      .reply(500);

    expect(get).throws;
  });

  it("error refreshing cache", async () => {
    //First call succeed
    mock
      .onGet("https://uat.interop.pagopa.it/.well-known/jwks.json")
      .reply(200, jwksFromPdnd);

    const jwks = await get();
    const firstExpiresOn = jwks.expiresOn;
    expect(jwks.keys).to.be.eql(jwksFromPdnd.keys);
    expect(firstExpiresOn).not.to.be.undefined;
    expect(jwks.lastUpdate).not.to.be.undefined;

    // advance time to simulate expiration
    clock.tick(SIX_MINUTES_IN_MS);

    //Second call fails
    mock
      .onGet("https://uat.interop.pagopa.it/.well-known/jwks.json")
      .reply(500);

    // Check expiration
    const now = Date.now();
    const isCacheExpired = firstExpiresOn < now;
    expect(isCacheExpired).to.be.true;

    //Obtain old cache value
    const secondJwks = await get();
    const secondExpiresOn = secondJwks.expiresOn;
    expect(firstExpiresOn).to.be.eql(secondExpiresOn);
  });
});
