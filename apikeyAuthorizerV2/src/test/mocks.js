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
    context: {
        "uid": "APIKEY-testApiKey",
        "cx_id": "cxId",
        "cx_groups": 'group1,group2',
        "cx_type": "PA"
    },
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

const mockIamPolicyOkPdnd = {
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
    context: {
        "uid": "client_id",
        "cx_id": "cxId",
        "cx_groups": 'group1,group2',
        "cx_type": "PA"
    },
    usageIdentifierKey: "testApiKey"
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

const mockJwtValidationOk = {
    aud: "https://api.dev.pn.pagopa.it",
    sub: "bd5ecb78-e1d4-4322-921c-6fe0eaa427d5",
    nbf: 1680601793,
    purposeId: "20999a0f-ec40-41c7-9fdd-9d3ad079ad81",
    iss: "uat.interop.pagopa.it",
    exp: 1680605393,
    iat: 1680601793,
    client_id: "bd5ecb78-e1d4-4322-921c-6fe0eaa427d5",
    jti: "4e608e98-0eb4-47a9-8c17-f9736cc66988"
}

const mockEventTokenNull = {
  type: "REQUEST",
  methodArn: "arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/request",
  resource: "/request",
  path: "/request",
  httpMethod: "GET",
  headers: {
    "x-api-key": "1577ca43-098e-4c99-96df-2679b3afe421"
  }
}

module.exports = { mockIamPolicyOk, mockIamPolicyKo, mockPaAggregationFound, mockAggregateFound, mockJwtValidationOk, mockIamPolicyOkPdnd, mockEventTokenNull }