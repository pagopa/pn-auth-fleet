const sinon = require("sinon");
const jwksCache = require("../app/jwksCache");
const retrieverJwks = require("../app/retrieverJwks");
const fs = require("fs");
const chaiAsPromised = require("chai-as-promised");
const chai = require("chai");
chai.use(chaiAsPromised);
const expect = chai.expect;

const SIX_MINUTES_IN_MS = 360000;
let clock;

describe("test jwksCache", () => {
  const jwksFromSelc = JSON.parse(
    fs.readFileSync("./src/test/jwks-mock/api.selfcare.pagopa.it.jwks.json", {
      encoding: "utf8",
    })
  );

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    process.env.CACHE_TTL = "300";
  });

  afterEach(() => {
    sinon.reset();
    sinon.restore();
    clock.restore();
  });

  it("initialize cache when is empty", async () => {
    sinon.stub(retrieverJwks, "getJwks").callsFake((issuer) => jwksFromSelc);

    const jwks = await jwksCache.get("api.selfcare.pagopa.it");
    const isCacheActive = jwksCache.isCacheActive();
    expect(jwks.keys).to.be.eql(jwksFromSelc.keys);
    expect(jwks.expiresOn).not.to.be.undefined;
    expect(jwks.lastUpdate).not.to.be.undefined;
    expect(isCacheActive).to.be.true;
  });

  it("error initializing cache", async () => {
    //First call fails
    sinon.stub(retrieverJwks, "getJwks").throws();

    expect(jwksCache.get).throws;
  });

  it("error refreshing cache", async () => {
    //First call succeed
    sinon.stub(retrieverJwks, "getJwks").callsFake((issuer) => jwksFromSelc);

    const jwks = await jwksCache.get("api.selfcare.pagopa.it");
    const firstExpiresOn = jwks.expiresOn;
    expect(jwks.keys).to.be.eql(jwksFromSelc.keys);
    expect(firstExpiresOn).not.to.be.undefined;
    expect(jwks.lastUpdate).not.to.be.undefined;

    // advance time to simulate expiration
    clock.tick(SIX_MINUTES_IN_MS);

    //Second call fails
    sinon.reset();
    sinon.restore();
    sinon.stub(retrieverJwks, "getJwks").throws();

    // Check expiration
    const now = Date.now();
    const isCacheExpired = firstExpiresOn < now;
    expect(isCacheExpired).to.be.true;

    //Obtain old cache value
    const secondJwks = await jwksCache.get("api.selfcare.pagopa.it");
    const secondExpiresOn = secondJwks.expiresOn;
    expect(firstExpiresOn).to.be.eql(secondExpiresOn);
  });
});