const AWSXRay = require("aws-xray-sdk-core");
const axios = require("axios");
const http = require("http");
const https = require("https");

AWSXRay.captureHTTPsGlobal(http);
AWSXRay.captureHTTPsGlobal(https);

async function getCxId(taxId) {
  const pnDataVaultBaseUrl = process.env.PN_DATA_VAULT_BASEURL;
  const pnDataVaultUrl =
    pnDataVaultBaseUrl + "/datavault-private/v1/recipients/external/PF";
  try {
    console.log(pnDataVaultUrl);
    const response = await axios.post(pnDataVaultUrl, taxId, {
      headers: { "Content-Type": "text/plain" },
      timeout: 2000,
    });
    return response.data;
  } catch (err) {
    console.error("Error in get external Id ", err);
    throw new Error("Error in get external Id");
  }
}

module.exports = { getCxId };
