const { expect } = require("chai");
const { prepareJWKSRenewTimeMetric }  = require("../app/modules/metric/metricsUtils")
const fs = require('fs');
// dev notes: if you need to refresh JWT token, you can use the following code with the key stored in secret of Dev Core "test/pn-auth-fleet-unit-test-radd-jwt-key":
// https://github.com/pagopa/pn-troubleshooting/blob/main/jwt-auth/generate-jwt.js

describe("test prepareJWKSRenewTimeMetric", () => {
  it("prepare JWT data Metric", async () => {
    const issuerId = 'issuer'
    const timestamp = 1722596556
    const metrics = prepareJWKSRenewTimeMetric(issuerId, timestamp);
    expect(metrics).to.deep.equal({
      metricName: "JWKS_renew_time",
      dimension: {
        name: "issuer",
        value: issuerId
      },
      unit: "seconds",
      value: timestamp
    })
  })
});
