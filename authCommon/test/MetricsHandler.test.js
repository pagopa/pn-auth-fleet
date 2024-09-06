const { expect } = require("chai");
const MetricsHandler = require('../app/modules/aws/MetricsHandler'); 

describe('MetricsHandler', () => {
    let metricsHandler;

    beforeEach(() => {
        metricsHandler = new MetricsHandler();
    });

    it('should createMetric count type metric without exception', () => {
        let error = null;
        try {
            metricsHandler.addMetric("Unknown_iss", "count", 1, undefined, undefined)
        } catch (err) {
            error = err;
        }
        expect(error).to.be.null;
    });

    it('should createMetric count type metric without exception', () => {
        let error = null;
        try {
            metricsHandler.addMetric("Unknown_iss", "seconds", 1000, undefined, undefined)
        } catch (err) {
            error = err;
        }
        expect(error).to.be.null;
    });

    it('should createMultipleMetric count type metric without exception', () => {
        const metrics = [
            {metricName: "JWT_lifetime", unit: "seconds", value: 1000, dimension: {name:"issuer", value: 'issuer_ID'}, metadata: undefined},
            {metricName: "JWT_valid", unit: "count", value: 1, dimension: undefined, metadata: {name:"meta", value: 'metadata_value'}},
          ]
        let error = null;
        try {
            metricsHandler.addMultipleMetrics(metrics)
        } catch (err) {
            error = err;
        }
        expect(error).to.be.null;
    });

    it('should publish metrics', () => {
        const metrics = [
            {metricName: "JWT_lifetime", unit: "seconds", value: 1000, dimension: {name:"issuer", value: 'issuer_ID'}, metadata: undefined},
            {metricName: "JWT_valid", unit: "count", value: 1, dimension: undefined, metadata: {name:"meta", value: 'metadata_value'}},
          ]
        let error = null;
        try {
            metricsHandler.addMultipleMetrics(metrics)
        } catch (err) {
            error = err;
        }
        expect(error).to.be.null;
    });

});