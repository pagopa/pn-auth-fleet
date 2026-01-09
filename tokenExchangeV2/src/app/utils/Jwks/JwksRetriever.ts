import AWSXRay from "aws-xray-sdk-core";
import http from "http";
import https from "https";

import { JWKS } from "../../../models/Jwks";
import { retryWithDelay } from "../Retry";

AWSXRay.captureHTTPsGlobal(http);
AWSXRay.captureHTTPsGlobal(https);

const DEFAULT_TIMEOUT = 2000;
const RETRY_DELAY = 1000;
const MAX_RETRIES = 3;

async function innerGetJwks(): Promise<JWKS> {
  const jwksEndpoint = `${process.env.ONE_IDENTITY_BASEURL}/oidc/keys`;

  console.info("Fetching JWKS from:", jwksEndpoint);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const response = await fetch(jwksEndpoint, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
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
