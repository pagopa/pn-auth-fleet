import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export const oidcStateHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log("oidc-state called", JSON.stringify(event));
  return { statusCode: 200, body: JSON.stringify({ message: "ok" }) };
};
