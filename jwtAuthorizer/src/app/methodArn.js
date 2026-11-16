const parseMethodArn = (methodArn) => {
  const tmp = methodArn.split(":");
  const [restApiId, stage, method, ...resourcePath] = tmp[5].split("/");
  return {
    region: tmp[3],
    awsAccountId: tmp[4],
    restApiId,
    stage,
    method,
    resourcePath: resourcePath.join("/"),
  };
};

/** La logout ha un gateway dedicato: il suo restApiId arriva dal CloudFormation in WEB_LOGOUT_REST_API_ID */
const isLogoutRequest = (methodArn) =>
  parseMethodArn(methodArn).restApiId === process.env.WEB_LOGOUT_REST_API_ID;

/**
 * L'API di richiesta supporto Zendesk (pn-zendesk-auth) ha un gateway  dedicato e non è coperta dalle policy generate dal BFF.
 * La si riconosce dal metodo e dal path, che sono univoci tra i gateway WEB.
 */
const isZendeskRequest = (methodArn) => {
  const { method, resourcePath } = parseMethodArn(methodArn);
  return method === "POST" && resourcePath === "new-support-request";
};

module.exports = {
  parseMethodArn,
  isLogoutRequest,
  isZendeskRequest,
};
