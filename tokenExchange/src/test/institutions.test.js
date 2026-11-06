const chaiAsPromised = require("chai-as-promised");
const chai = require("chai");
const sinon = require("sinon");
const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");

const utils = require("../app/utils.js");
const { getInstitutionType, clearCache } = require("../app/institutions.js");

chai.use(chaiAsPromised);
const expect = chai.expect;

const institutionId = "7c2d9f1e-3c5b-4d9a-9f1a-8e6c2b7d4a91";
const paUrl = `${process.env.SELFCARE_BASEURL}/institutions/${institutionId}`;
const pgUrl = `${process.env.SELFCARE_PG_BASEURL}/institutions/${institutionId}`;
const apiKeys = { SelfCareApiKey: "pa-api-key", SelfCarePgApiKey: "pg-api-key" };

const organization = (role) => ({
  id: institutionId,
  roles: [{ partyRole: "MANAGER", role }],
});

describe("institutions", () => {
  let mock;
  let getSecretStub;

  before(() => {
    mock = new MockAdapter(axios);
  });

  beforeEach(() => {
    clearCache();
    getSecretStub = sinon
      .stub(utils, "getSecretFromStore")
      .resolves(JSON.stringify(apiKeys));
  });

  afterEach(() => {
    mock.reset();
    sinon.restore();
  });

  after(() => {
    mock.restore();
  });

  it("returns undefined without organization (PF)", async () => {
    const result = await getInstitutionType(undefined);

    expect(result).to.be.undefined;
    expect(mock.history.get).to.have.length(0);
    expect(getSecretStub.called).to.be.false;
  });

  it("calls the PA api also for support role (BS)", async () => {
    mock.onGet(paUrl).reply(200, { id: institutionId, institutionType: "PA" });

    const result = await getInstitutionType(organization("support"));

    expect(result).to.eq("PA");
    expect(mock.history.get).to.have.length(1);
    expect(mock.history.get[0].headers["Ocp-Apim-Subscription-Key"]).to.eq(
      "pa-api-key"
    );
  });

  it("calls the PA api with the PA api key", async () => {
    mock.onGet(paUrl).reply(200, { id: institutionId, institutionType: "PT" });

    const result = await getInstitutionType(organization("admin"));

    expect(result).to.eq("PT");
    expect(getSecretStub.calledWith(process.env.SELFCARE_SECRET_NAME)).to.be.true;
    expect(mock.history.get).to.have.length(1);
    expect(mock.history.get[0].headers["Ocp-Apim-Subscription-Key"]).to.eq(
      "pa-api-key"
    );
  });

  it("calls the PG api with the PG api key for pg- roles", async () => {
    mock.onGet(pgUrl).reply(200, { id: institutionId, institutionType: "PG" });

    const result = await getInstitutionType(organization("pg-admin"));

    expect(result).to.eq("PG");
    expect(mock.history.get).to.have.length(1);
    expect(mock.history.get[0].url).to.eq(pgUrl);
    expect(mock.history.get[0].headers["Ocp-Apim-Subscription-Key"]).to.eq(
      "pg-api-key"
    );
  });

  it("reads the secret only once across calls", async () => {
    mock.onGet(paUrl).reply(200, { id: institutionId, institutionType: "PA" });

    await getInstitutionType(organization("admin"));
    const result = await getInstitutionType(organization("operator"));

    expect(result).to.eq("PA");
    expect(mock.history.get).to.have.length(2);
    expect(getSecretStub.calledOnce).to.be.true;
  });

  it("rejects when the institution is not found", async () => {
    mock.onGet(paUrl).reply(404);

    await expect(
      getInstitutionType(organization("admin"))
    ).to.be.rejectedWith(Error, "Error in get institution type");
  });

  it("rejects when Selfcare returns an error", async () => {
    mock.onGet(paUrl).reply(500);

    await expect(
      getInstitutionType(organization("admin"))
    ).to.be.rejectedWith(Error, "Error in get institution type");
  });

  it("rejects when institutionType is missing in the response", async () => {
    mock.onGet(paUrl).reply(200, { id: institutionId });

    await expect(
      getInstitutionType(organization("admin"))
    ).to.be.rejectedWith(Error, "Error in get institution type");
  });

  it("rejects when institutionType is not supported", async () => {
    mock.onGet(paUrl).reply(200, { id: institutionId, institutionType: "GSP" });

    await expect(
      getInstitutionType(organization("admin"))
    ).to.be.rejectedWith(Error, "Error in get institution type");
  });

  it("rejects when the secret can't be read", async () => {
    getSecretStub.rejects(new Error("Error in get secret"));

    await expect(
      getInstitutionType(organization("admin"))
    ).to.be.rejectedWith(Error, "Error in get institution type");
    expect(mock.history.get).to.have.length(0);
  });
});
