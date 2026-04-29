import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { generateRedirectResponse } from "../../utils/Responses";

export const oidcAuthorizeHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const eventOrigin = event.headers?.origin;

  console.log("oidc-authorize called", JSON.stringify(event));
  const loocation = '';
  return generateRedirectResponse(loocation, eventOrigin!);
};
