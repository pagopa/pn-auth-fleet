import chaiAsPromised from "chai-as-promised";
import chai from "chai";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { getCxId  } from "../app/dataVaultClient.js";

chai.use(chaiAsPromised);
const expect = chai.expect;

describe("retrieverCxId", () => {
  let mock;
  const BASE_URL = "http://mock-url:8080";

  before(() => {
    process.env.PN_DATA_VAULT_BASEURL = BASE_URL;
    //mock = new MockAdapter(axios);
    mock = new MockAdapter(axios, { onNoMatch: "throwException" });
  });

  after(() => {
    if (mock) mock.restore();
    delete process.env.PN_DATA_VAULT_BASEURL;
  });

  it("success", async () => {
    const result = "123e4567-e89b-12d3-a456-426655440000";
    const expectedUrl = `${BASE_URL}/datavault-private/v1/recipients/external/PF`;

    mock
      .onPost(
        //"http://${ApplicationLoadBalancerDomain}:8080/datavault-private/v1/recipients/external/PF",
        expectedUrl,
        "CGNNMO01T10A944Q"
      )
      .reply(200, result);

    const response = await getCxId("CGNNMO01T10A944Q");
    expect(response).to.be.equal(result);
  });

  it("error", async () => {
    const expectedUrl = `${BASE_URL}/datavault-private/v1/recipients/external/PF`;

    mock
      .onPost(
        //"http://${ApplicationLoadBalancerDomain}:8080/datavault-private/v1/recipients/external/PF",
        expectedUrl,
        "CGNNMO01T10A944Q"
      )
      .reply(500);

    await expect(getCxId("CGNNMO01T10A944Q")).to.be.rejectedWith(
      Error, "Error in get external Id"
    );
  });
});
