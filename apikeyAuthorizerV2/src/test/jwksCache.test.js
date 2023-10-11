const sinon = require("sinon");
const fs = require("fs");
const chaiAsPromised = require("chai-as-promised");
const chai = require("chai");

const { get, isCacheActive } = require("../app/jwksCache");
const retrieverPdndJwks = require("../app/retrieverPdndJwks");

chai.use(chaiAsPromised);
const expect = chai.expect;

const SIX_MINUTES_IN_MS = 360000;
let clock;

describe("test jwksCache", () => {
  const jwksFromPdnd = JSON.parse(
    fs.readFileSync("./src/test/jwks-mock/interop-pagopa-jwks.json", {
      encoding: "utf8",
    })
  );

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    process.env.PDND_ISSUER = "uat.interop.pagopa.it";
    process.env.PDND_AUDIENCE = "https://api.dev.pn.pagopa.it";
    process.env.CACHE_TTL = "300";
  });

  afterEach(() => {
    sinon.reset();
    sinon.restore();
    clock.restore();
  });

  it("initialize cache when is empty", async () => {
    sinon
      .stub(retrieverPdndJwks, "getJwks")
      .callsFake((issuer) => jwksFromPdnd);

    const jwks = await get();
    expect(jwks.keys).to.be.eql(jwksFromPdnd.keys);
    expect(jwks.expiresOn).not.to.be.undefined;
    expect(jwks.lastUpdate).not.to.be.undefined;
    expect(isCacheActive()).to.be.true;
  });

  it("refresh cache when is expired", async () => {
    sinon
      .stub(retrieverPdndJwks, "getJwks")
      .callsFake((issuer) => jwksFromPdnd);

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
    sinon.stub(retrieverPdndJwks, "getJwks").throws();

    expect(get).throws;
  });

  it("error refreshing cache", async () => {
    //First call succeed
    sinon
      .stub(retrieverPdndJwks, "getJwks")
      .callsFake((issuer) => jwksFromPdnd);

    const jwks = await get();
    const firstExpiresOn = jwks.expiresOn;
    expect(jwks.keys).to.be.eql(jwksFromPdnd.keys);
    expect(firstExpiresOn).not.to.be.undefined;
    expect(jwks.lastUpdate).not.to.be.undefined;

    // advance time to simulate expiration
    clock.tick(SIX_MINUTES_IN_MS);

    //Second call fails
    sinon.reset();
    sinon.restore();
    sinon.stub(retrieverPdndJwks, "getJwks").throws();

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
