const AWSXRay = require("aws-xray-sdk-core");
const http = require("http");
const https = require("https");

AWSXRay.captureHTTPsGlobal(http);
AWSXRay.captureHTTPsGlobal(https);

// the axios import must be after the xray capture, otherwise the xray tracking will not work
const axios = require("axios");

async function getJwks(issuer) {
  const jwksendpoint = "https://" + issuer + "/.well-known/jwks.json";
  console.info("jwksendpoint is ", jwksendpoint);
  try {
    const response = await axios.get(jwksendpoint, { timeout: 2000 });
    return response.data;
  } catch (err) {
    console.error("Error in get key ", err);
    throw new Error("Error in get pub key");
  }
}

module.exports = { getJwks };
