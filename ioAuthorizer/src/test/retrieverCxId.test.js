const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");

const { getCxId } = require("../app/dataVaultClient.js");

describe("retrieverCxId success", () => {
  const result = "123e4567-e89b-12d3-a456-426655440000";
  const mock = new MockAdapter(axios);
  mock
    .onGet(
      "http://${ApplicationLoadBalancerDomain}:8080/datavault-private/v1/recipients/external/PF/CGNNMO01T10A944Q"
    )
    .reply(200, result);

  getCxId(
    "http://${ApplicationLoadBalancerDomain}:8080/datavault-private/v1/recipients/external/PF/CGNNMO01T10A944Q"
  ).then(function (response) {
    console.log(response);
  });
});

describe("retrieverCxId error", () => {
  const mock = new MockAdapter(axios);
  mock
    .onGet(
      "http://${ApplicationLoadBalancerDomain}:8080/datavault-private/v1/recipients/external/PF/CGNNMO01T10A944Q"
    )
    .reply(500);

  getCxId(
    "http://${ApplicationLoadBalancerDomain}:8080/datavault-private/v1/recipients/external/PF/CGNNMO01T10A944Q"
  ).then(function (response) {
    console.log(response);
  });
});
