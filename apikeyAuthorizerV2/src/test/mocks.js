const mockIamPolicy = {
  principalId: "testPrincipal",
  policyDocument: {
    Version: "2012-10-17",
    Statement: [
      {
        Action: "execute-api:Invoke",
        Effect: "Allow",
        Resource: "arn",
      },
    ],
  },
  context: {
    uid: "APIKEY-testApiKey",
    cx_id: "cxId",
    cx_groups: "group1,group2",
    cx_type: "PA",
    sourceChannelDetails: "NONINTEROP",
  },
  usageIdentifierKey: "testApiKey",
};

const mockPaAggregationFound = {
  cxId: "testCx",
  aggregateId: "testAggregate",
};

const mockAggregateFound = {
  aggregateId: "testAggregate",
  AWSApiKey: "testApiKey",
  AWSApiKeyId: "testApiKeyId",
};

const mockVirtualKey = {
  id: "testId",
  "x-pagopa-pn-cx-id": "testCx",
  groups: ["test", "test2"],
  status: "ENABLED",
  virtualKey: "testVk",
  pdnd: false,
};

const mockDecodedJwt = {
  aud: "https://api.dev.pn.pagopa.it",
  sub: "bd5ecb78-e1d4-4322-921c-6fe0eaa427d5",
  nbf: 1681215060,
  purposeId: "20999a0f-ec40-41c7-9fdd-9d3ad079ad81",
  iss: "uat.interop.pagopa.it",
  exp: 1681218660,
  iat: 1681215060,
  client_id: "bd5ecb78-e1d4-4322-921c-6fe0eaa427d5",
  jti: "651b205c-e76e-44d3-b028-45a99ae46e17",
};

const mockEventTokenNull = {
  type: "REQUEST",
  methodArn:
    "arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/request",
  resource: "/request",
  path: "/request",
  httpMethod: "GET",
  headers: {
    "x-api-key": "1577ca43-098e-4c99-96df-2679b3afe421",
  },
};

module.exports = {
  mockIamPolicy,
  mockPaAggregationFound,
  mockAggregateFound,
  mockDecodedJwt,
  mockEventTokenNull,
  mockVirtualKey,
};
