const mockIamPolicyOk = {
    principalId: "testPrincipal",
    policyDocument: {
        Version: '2012-10-17',
        Statement: [
            {
                Action: 'execute-api:Invoke',
                Effect: "Allow",
                Resource: "arn"
            }
        ]
    },
    context: {},
    usageIdentifierKey: "testApiKey"
}

const mockIamPolicyKo = {
    principalId: "testPrincipal",
    policyDocument: {
        Version: '2012-10-17',
        Statement: [
            {
                Action: 'execute-api:Invoke',
                Effect: "Deny",
                Resource: "arn"
            }
        ]
    },
    context: {}
}

const mockPaAggregationFound = {
    cxId: "testCx",
    aggregateId: "testAggregate"
}

const mockAggregateFound = {
    aggregateId: "testAggregate",
    AWSApiKey : "testApiKey",
    AWSApiKeyId: "testApiKeyId"
}

module.exports = { mockIamPolicyKo, mockIamPolicyOk, mockPaAggregationFound, mockAggregateFound }