import AWSXRay from "aws-xray-sdk-core";
import axios from "axios";
import http from "http";
import https from "https";

AWSXRay.captureHTTPsGlobal(http);
AWSXRay.captureHTTPsGlobal(https);

const getJwks = async (issuer) => {
  const jwksendpoint = "https://" + issuer + "/.well-known/jwks.json";
  console.info("jwksendpoint is ", jwksendpoint);
  try {
    const response = await axios.get(jwksendpoint, { timeout: 2000 });
    return response.data;
  } catch (err) {
    console.error("Error in get key ", err);
    throw new Error("Error in get pub key");
  }
};

export { getJwks };
