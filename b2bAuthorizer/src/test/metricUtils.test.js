const { expect } = require("chai");
const { prepareMetric, prepareMetricsJwtData }  = require("../app/modules/metric/metricsUtils")
const fs = require('fs');
// dev notes: if you need to refresh JWT token, you can use the following code with the key stored in secret of Dev Core "test/pn-auth-fleet-unit-test-radd-jwt-key":
// https://github.com/pagopa/pn-troubleshooting/blob/main/jwt-auth/generate-jwt.js

describe("test metricUtils", () => {
  it("prepare JWT data Metric", async () => {
    const decodedJwtToken = fs.readFileSync('src/test/resources/decodedJwt.json');
    const metrics = prepareMetricsJwtData(decodedJwtToken, false)
    expect(metrics).is.not.undefined
    expect(metrics).to.be.an('array')
    expect(metrics.length).to.be.equal(3)
  })

  it("prepare single Metric", async () => {
    const decodedJwtToken = fs.readFileSync('src/test/resources/decodedJwt.json');
    const metrics = prepareMetric("Unknown_iss", decodedJwtToken);
    expect(metrics).to.deep.equal({
      metricName: "Unknown_iss",
      metadata: undefined,
      dimension: undefined,
      unit: "count",
      value: 1
    })
  })
});
