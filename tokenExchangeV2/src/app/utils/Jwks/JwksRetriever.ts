// import AWSXRay from "aws-xray-sdk-core";
// import http from "http";
// import https from "https";
// import { retryWithDelay } from "../ParameterStore";
// import { JWKS } from "../../../models/Jwks";

// AWSXRay.captureHTTPsGlobal(http);
// AWSXRay.captureHTTPsGlobal(https);

// const DEFAULT_TIMEOUT = 2000;
// const RETRY_DELAY = 1000;
// const MAX_RETRIES = 3;

// const DEFAULT_JWKS_MAPPING: Record<string, string> = {
//   "api.selfcare.pagopa.it":
//     "https://uat.selfcare.pagopa.it/.well-known/jwks.json",
//   "spidhub-test.dev.pn.pagopa.it":
//     "https://spidhub-test.dev.pn.pagopa.it:9090/.well-known/jwks.json",
//   "spid-hub-test.dev.pn.pagopa.it":
//     "https://spid-hub-test.dev.pn.pagopa.it:8080/.well-known/jwks.json",
//   "spid-hub-test.uat.pn.pagopa.it":
//     "https://spid-hub-test.uat.pn.pagopa.it:8080/.well-known/jwks.json",
// };

// async function innerGetJwks(issuer: string): Promise<JWKS> {
//   const issuersUrl = process.env.JWKS_MAPPING
//     ? JSON.parse(process.env.JWKS_MAPPING)
//     : DEFAULT_JWKS_MAPPING;

//   const jwksEndpoint = issuersUrl[issuer] ?? `${issuer}/.well-known/jwks.json`;

//   console.info("Fetching JWKS from:", jwksEndpoint);

//   const controller = new AbortController();
//   const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

//   try {
//     const response = await fetch(jwksEndpoint, { signal: controller.signal });
//     clearTimeout(timeoutId);

//     if (!response.ok) {
//       throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
//     }

//     return await response.json();
//   } catch (error) {
//     clearTimeout(timeoutId);
//     console.warn("Error fetching JWKS:", error);
//     throw new Error("Error in get pub key");
//   }
// }

// export async function getJwks(issuer: string): Promise<JWKS> {
//   return await retryWithDelay<JWKS>(
//     () => innerGetJwks(issuer),
//     RETRY_DELAY,
//     MAX_RETRIES
//   );
// }
