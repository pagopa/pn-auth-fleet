function prepareIssuerDimension( issuerId ) {
    return {
        name: "issuer",
        value: issuerId
    }
}

const prepareJWKSRenewTimeMetric = (issuerId, data) => {
    let value = data;
    let unit = "seconds";
    let dimension = prepareIssuerDimension(issuerId); 
    const metric = {
        metricName: 'JWKS_renew_time', 
        unit: unit, 
        value: value,
        dimension: dimension
    }
    return metric;
}

module.exports = {
    prepareJWKSRenewTimeMetric
}
