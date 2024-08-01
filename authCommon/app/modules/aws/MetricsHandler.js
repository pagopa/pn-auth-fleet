const { Metrics, MetricUnit } = require('@aws-lambda-powertools/metrics');

class MetricsHandler {

    #metrics = new Metrics()

    constructor() {
        this.#metrics = new Metrics({ namespace: 'PnAuthFleet/B2bAuthorizer', serviceName: process.env.AWS_LAMBDA_FUNCTION_NAME });
    }

    addMetric(metricName, unit, value, dimension, metadata) {
        switch (unit) {
            case 'count':
                unit = MetricUnit.Count
                break;
            case 'seconds':
                unit = MetricUnit.Seconds
                break;
        }
        this.#metrics.addMetric(metricName, unit, value)
        dimension ? this.#metrics.addDimension(dimension.name, dimension.value) : null
        metadata ? this.#metrics.addDimension(metadata.name, metadata.value) : null
    }
    
    addMultipleMetrics(metrics) {
        metrics.forEach(metric => {
            this.addMetric(metric.metricName, metric.unit, metric.value, metric.dimension, metric.metadata)
        });
    }
    
    publishMetrics() {
        this.#metrics.publishStoredMetrics()
    }
}

module.exports = MetricsHandler;