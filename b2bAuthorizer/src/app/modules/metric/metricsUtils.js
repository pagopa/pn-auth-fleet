function prepareIssuerDimension( decodedJwtToken ) {
    if(!decodedJwtToken.payload) {
        return {};
    }
    const issuerId = decodedJwtToken.payload.iss
    if(!issuerId) {
        return {
            name: "issuer",
            value: issuerId
        }
    }
}

function prepareJWTlifetime( decodedJwtToken ) {
    if(!decodedJwtToken.payload) {
        return 0;
    }
    const exp = decodedJwtToken.payload.exp
    const iat = decodedJwtToken.payload.iat
    return exp - iat
}

function prepareJWTlifepercent( decodedJwtToken ) {
    if(!decodedJwtToken.payload) {
        return 0;
    }
    const timestamp = new Date().getTime() / 1000
    const exp = decodedJwtToken.payload.exp
    const iat = decodedJwtToken.payload.iat
    return (iat - timestamp) / (exp - iat)
}
function prepareMetric(metricName, decodedJwtToken) {
    let value;
    let unit;
    let dimension; 
    let metadata;
    switch (metricName) {
        case 'JWT_lifetime':
            value = prepareJWTlifetime(decodedJwtToken)
            unit = "seconds"
            dimension = prepareIssuerDimension(decodedJwtToken)
            break;
        case 'JWT_lifepercent':
            value = prepareJWTlifepercent(decodedJwtToken)
            unit = "seconds";
            dimension = prepareIssuerDimension(decodedJwtToken)
            break;
        case 'JWT_valid':
            dimension = prepareIssuerDimension(decodedJwtToken)
        case 'JWT_valid':
            dimension = prepareIssuerDimension(decodedJwtToken)
        default: //always count and 1
            value = 1;
            unit = "count";
    } 
    const metric = {
        metricName: metricName, 
        unit: unit, 
        value: value,
        dimension: dimension,
        metadata: metadata
    }
    return metric;
}

const prepareMetricsJwtData = (decodedJwtToken, isValid) => {
    if(!decodedJwtToken) {
        return []
    }
    const metrics = [
        prepareMetric("JWT_lifetime", decodedJwtToken),
        prepareMetric("JWT_lifepercent", decodedJwtToken),
        prepareMetric(isValid ? "JWT_valid" : "JWT_invalid", decodedJwtToken),
    ]
    return metrics;
}

module.exports = {
    prepareMetric,
    prepareMetricsJwtData
}