const chaiAsPromised = require("chai-as-promised");
const chai = require("chai");
const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");

const { getCxId } = require("../app/dataVaultClient.js");

chai.use(chaiAsPromised);
const expect = chai.expect;

describe("retrieverCxId", () => {
  let mock;

  before(() => {
    mock = new MockAdapter(axios);
  });

  after(() => {
    mock.restore();
  });

  it("success", async () => {
    const result = "123e4567-e89b-12d3-a456-426655440000";
    mock
      .onPost(
        "http://${ApplicationLoadBalancerDomain}:8080/datavault-private/v1/recipients/external/PF",
        "CGNNMO01T10A944Q"
      )
      .reply(200, result);

    const response = await getCxId("CGNNMO01T10A944Q");
    expect(response).to.be.equal(result);
  });

  it("error", async () => {
    mock
      .onPost(
        "http://${ApplicationLoadBalancerDomain}:8080/datavault-private/v1/recipients/external/PF",
        "CGNNMO01T10A944Q"
      )
      .reply(500);

    await expect(getCxId("CGNNMO01T10A944Q")).to.be.rejectedWith(
      Error,
      "Error in get external Id"
    );
  });
});
