import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export const oidcAuthorizeHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log("oidc-authorize called", JSON.stringify(event));
  return { statusCode: 200, body: JSON.stringify({ message: "ok" }) };
};
