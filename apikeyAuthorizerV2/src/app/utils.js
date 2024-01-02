function anonymizeKey(cleanString) {
  if (!cleanString) return "";

  if (cleanString.length < 6) return "".padStart(cleanString.length, "*");

  const firstTwoChars = cleanString.substring(0, 2);
  const lastTwoChars = cleanString.substring(
    cleanString.length - 2,
    cleanString.length
  );

  const hiddenStringLength = cleanString.length - 4;
  const hiddenString = "".padStart(hiddenStringLength, "*");

  return firstTwoChars + hiddenString + lastTwoChars;
}

function logEvent(event) {
  console.info("New event received", extractLoggableInfoFromEvent(event));
}

function extractLoggableInfoFromEvent(event) {
  const loggableObject = {
    path: event["path"],
    httpMethod: event["httpMethod"],
    "X-Amzn-Trace-Id": event["headers"]["X-Amzn-Trace-Id"],
    "x-api-key": anonymizeKey(event["headers"]["x-api-key"]),
  };

  return loggableObject;
}

function logIamPolicy(iamPolicy) {
  console.log("IAM Policy:", maskLoggableInfoFromIamPolicy(iamPolicy));
}

function maskLoggableInfoFromIamPolicy(iamPolicy) {
  const iamPolicyCopy = JSON.parse(JSON.stringify(iamPolicy));
  iamPolicyCopy.usageIdentifierKey = anonymizeKey(
    iamPolicyCopy.usageIdentifierKey
  );
  iamPolicyCopy.context.uid = anonymizeUid(iamPolicyCopy.context.uid);
  return iamPolicyCopy;
}

function anonymizeUid(uid) {
  const prefix = uid.substring(0, uid.indexOf("-") + 1);
  const apikeyToHide = uid.substring(uid.indexOf("-") + 1);
  return prefix + anonymizeKey(apikeyToHide);
}

function findAttributeValueInObjectWithInsensitiveCase(object, target) {
  const foundKeys = Object.keys(object).filter(
    (key) => key.toLowerCase() === target.toLowerCase()
  );
  return foundKeys.length !== 0 ? object[foundKeys[0]] : undefined;
}

module.exports = {
  anonymizeKey,
  findAttributeValueInObjectWithInsensitiveCase,
  logEvent,
  logIamPolicy,
};
