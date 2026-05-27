import AWSXRay from "aws-xray-sdk-core";
import http from "http";
import https from "https";
import axios from "axios";

import { retryWithDelay } from "../../../../utils/Retry";
import { retrieveEnvVariable } from "../../../../config";
import { JWKS } from "../../models/Jwks";

AWSXRay.captureHTTPsGlobal(http);
AWSXRay.captureHTTPsGlobal(https);

const DEFAULT_TIMEOUT = 2000;
const RETRY_DELAY = 1000;
const MAX_RETRIES = 3;

/**
 * Fetches JWKS (JSON Web Key Set) from the OneIdentity OIDC endpoint.
 */
async function innerGetJwks(): Promise<JWKS> {
  const oneIdentityBaseUrl = retrieveEnvVariable("ONE_IDENTITY_BASEURL");
  const jwksEndpoint = `${oneIdentityBaseUrl}/oidc/keys`;

  console.info("Fetching JWKS from:", jwksEndpoint);

  try {
    const response = await axios.get<JWKS>(jwksEndpoint, { timeout: DEFAULT_TIMEOUT });
    return response.data;
  } catch (error) {
    console.warn("Error fetching JWKS:", error);
    throw new Error("Error in get pub key");
  }
}

export async function getJwks(): Promise<JWKS> {
  return await retryWithDelay<JWKS>(
    () => innerGetJwks(),
    RETRY_DELAY,
    MAX_RETRIES
  );
}
