const AWSXRay = require("aws-xray-sdk-core");
const http = require("http");
const https = require("https");

AWSXRay.captureHTTPsGlobal(http);
AWSXRay.captureHTTPsGlobal(https);

// the axios import must be after the xray capture, otherwise the xray tracking will not work
const axios = require("axios");

function anonymizeTaxId(taxId){
  if (!taxId) return "";

  if (taxId.length < 6) return "".padStart(taxId.length, "*");

  const firstTwoChars = taxId.substring(0, 2);
  const lastTwoChars = taxId.substring(
    taxId.length - 2,
    taxId.length
  );

  const hiddenStringLength = taxId.length - 4;
  const hiddenString = "".padStart(hiddenStringLength, "*");

  return firstTwoChars + hiddenString + lastTwoChars;
}

function prepareLoggableInfoFromAxiosResponse(err) {
  if(err.response){
    delete err.response.config

    return err.response
  } 

  return {
    message: err.message
  }
}

async function getCxId(taxId) {
  const anonymizedTaxId = anonymizeTaxId(taxId);

  const pnDataVaultBaseUrl = process.env.PN_DATA_VAULT_BASEURL;
  const pnDataVaultUrl = pnDataVaultBaseUrl + "/datavault-private/v1/recipients/external/PF";
  console.log("Invoking external service pn-data-vault PF. Waiting Sync response.", {
    taxId: anonymizedTaxId,
    url: pnDataVaultUrl
  })
  
  try {
    const response = await axios.post(pnDataVaultUrl, taxId, {
      headers: { "Content-Type": "text/plain" },
      timeout: 2000,
    });
    return response.data;
  } catch (err) {
    const loggableError = prepareLoggableInfoFromAxiosResponse(err)
    console.log("External service pn-data-vault PF returned errors", {
      error: loggableError,
      url: pnDataVaultUrl,
      taxId: anonymizedTaxId
    })

    throw new Error("Error in get external Id");
  }
}

module.exports = { getCxId };
