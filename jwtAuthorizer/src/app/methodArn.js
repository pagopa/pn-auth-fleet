const parseMethodArn = (methodArn) => {
  const tmp = methodArn.split(":");
  const apiGatewayArnTmp = tmp[5].split("/");
  return {
    region: tmp[3],
    awsAccountId: tmp[4],
    restApiId: apiGatewayArnTmp[0],
    stage: apiGatewayArnTmp[1],
  };
};

/** La logout ha un gateway dedicato: il suo restApiId arriva dal CloudFormation in WEB_LOGOUT_REST_API_ID */
const isLogoutRequest = (methodArn) =>
  parseMethodArn(methodArn).restApiId === process.env.WEB_LOGOUT_REST_API_ID;

module.exports = {
  parseMethodArn,
  isLogoutRequest,
};
