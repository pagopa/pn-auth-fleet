const AWSXRay = require("aws-xray-sdk-core");
const http = require("http");
const https = require("https");

AWSXRay.captureHTTPsGlobal(http);
AWSXRay.captureHTTPsGlobal(https);

// the axios import must be after the xray capture, otherwise the xray tracking will not work
const axios = require("axios");

// function to retry async function with a delay
async function retryWithDelay(fn, delay, retries) {
  try {
    return await fn();
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, delay));
      return await retryWithDelay(fn, delay, retries - 1);
    } else {
      throw err;
    }
  }
}

async function innerGetJwks(issuer) {
  const issuersUrl = process.env.JWKS_MAPPING
    ? JSON.parse(process.env.JWKS_MAPPING)
    : {
        "api.selfcare.pagopa.it":
          "https://uat.selfcare.pagopa.it/.well-known/jwks.json", //TODO vedi stato issue SELC-390
        "spidhub-test.dev.pn.pagopa.it":
          "https://spidhub-test.dev.pn.pagopa.it:9090/.well-known/jwks.json",
        "spid-hub-test.dev.pn.pagopa.it":
          "https://spid-hub-test.dev.pn.pagopa.it:8080/.well-known/jwks.json",
        "spid-hub-test.uat.pn.pagopa.it":
          "https://spid-hub-test.uat.pn.pagopa.it:8080/.well-known/jwks.json",
      };

  let jwksendpoint = issuersUrl[issuer];
  if (!jwksendpoint) {
    jwksendpoint = issuer + "/.well-known/jwks.json";
  }
  console.info("jwksendpoint is ", jwksendpoint);
  try {
    const response = await axios.get(jwksendpoint, { timeout: 2000 });
    return response.data;
  } catch (err) {
    console.error("Error in get key ", err);
    throw new Error("Error in get pub key");
  }
}

async function getJwks(issuer) {
  return await retryWithDelay(
    () => innerGetJwks(issuer),
    1000,
    3
  );
}

module.exports = { getJwks };
