const defaultDenyAllPolicy = {
  principalId: "user",
  policyDocument: {
    Version: "2012-10-17",
    Statement: [
      {
        Action: "execute-api:Invoke",
        Effect: "Deny",
        Resource: "*",
      },
    ],
  },
};

const defaultAllowPolicy = {
  principalId: "fake-user",
  policyDocument: {
    Version: "2012-10-17",
    Statement: [
      {
        Action: "execute-api:Invoke",
        Effect: "Allow",
        Resource: "*",
      },
    ],
  },
  context: {
    cx_type: "FAKE_cx_type",
    cx_id: "FAKE_cx_id",
    cx_groups: "FAKE_cx_groups",
    cx_role: "FAKE_cx_role",
    uid: "FAKE_uid",
    cx_jti: "FAKE_cx_jti",
    sourceChannel: "FAKE_sourceChannel",
    sourceChannelDetails: null,
    applicationRole: "FAKE_applicationRole",
    allowedApplicationRoles: null,
    callableApiTags: null
  },
  usageIdentifierKey: "NOT_YET_IMPLEMENTED"
};

async function handleEvent(event) {
  const encodedToken = event?.authorizationToken?.replace("Bearer ", "");
  if (encodedToken) {
    console.log("encodedToken", encodedToken);
    return defaultAllowPolicy;
  } else {
    console.warn("EncodedToken is null");
    return defaultDenyAllPolicy;
  }
}

module.exports = { handleEvent };
