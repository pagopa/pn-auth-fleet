const chaiAsPromised = require("chai-as-promised");
const chai = require("chai");
const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");

const { getCxId } = require("../app/dataVaultClient.js");
chai.use(chaiAsPromised);
const expect = chai.expect;

describe("retrieverCxId", () => {
  it("retries on 500 and succeeds on third attempt", async () => {
    const result = "123e4567-e89b-12d3-a456-426655440000";
    let callCount = 0;
    mock.onPost(
      "http://${ApplicationLoadBalancerDomain}:8080/datavault-private/v1/recipients/external/PF",
      "CGNNMO01T10A944Q"
    ).reply(() => {
      callCount++;
      if (callCount < 3) {
        return [500];
      }
      return [200, result];
    });

    const response = await getCxId("CGNNMO01T10A944Q");
    expect(response).to.be.equal(result);
    expect(callCount).to.be.equal(3);
  });

  it("fails after 3 retries on 500", async () => {
    let callCount = 0;
    mock.onPost(
      "http://${ApplicationLoadBalancerDomain}:8080/datavault-private/v1/recipients/external/PF",
      "CGNNMO01T10A944Q"
    ).reply(() => {
      callCount++;
      return [500];
    });

    await expect(getCxId("CGNNMO01T10A944Q")).to.be.rejectedWith(
      Error,
      "Error in get external Id"
    );
    expect(callCount).to.be.equal(3);
  });
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
