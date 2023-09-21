const axios = require("axios");
const dataVaultClient = require("../app/dataVaultClient.js");
var MockAdapter = require("axios-mock-adapter");

describe("retrieverCxId success", () => {
  let result = "123e4567-e89b-12d3-a456-426655440000";
  var mock = new MockAdapter(axios);
  mock
    .onGet(
      "http://${ApplicationLoadBalancerDomain}:8080/datavault-private/v1/recipients/external/PF/CGNNMO01T10A944Q"
    )
    .reply(200, result);

  dataVaultClient
    .getCxId(
      "http://${ApplicationLoadBalancerDomain}:8080/datavault-private/v1/recipients/external/PF/CGNNMO01T10A944Q"
    )
    .then(function (response) {
      console.log(response);
    });
});

describe("retrieverCxId error", () => {
  var mock = new MockAdapter(axios);
  mock
    .onGet(
      "http://${ApplicationLoadBalancerDomain}:8080/datavault-private/v1/recipients/external/PF/CGNNMO01T10A944Q"
    )
    .reply(500);

  dataVaultClient
    .getCxId(
      "http://${ApplicationLoadBalancerDomain}:8080/datavault-private/v1/recipients/external/PF/CGNNMO01T10A944Q"
    )
    .then(function (response) {
      console.log(response);
    });
});
