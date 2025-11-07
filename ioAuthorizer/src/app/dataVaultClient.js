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

function isErrorToRetry(err){
  const isTimeout = err.code === 'ECONNABORTED';
  const is500 = err.response && err.response.status === 500;
  return isTimeout || is500    
}

async function getCxId(taxId) {
  const anonymizedTaxId = anonymizeTaxId(taxId);

  const pnDataVaultBaseUrl = process.env.PN_DATA_VAULT_BASEURL;
  const pnDataVaultUrl = pnDataVaultBaseUrl + "/datavault-private/v1/recipients/external/PF";
  console.log("Invoking external service pn-data-vault PF. Waiting Sync response.", {
    taxId: anonymizedTaxId,
    url: pnDataVaultUrl
  })
  
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await axios.post(pnDataVaultUrl, taxId, {
        headers: { "Content-Type": "text/plain" },
        timeout: 2000,
      });
      return response.data;
    } catch (err) {
      const loggableError = prepareLoggableInfoFromAxiosResponse(err);
      console.log(`Attempt ${attempt} failed for pn-data-vault PF`, {
        error: loggableError,
        url: pnDataVaultUrl,
        taxId: anonymizedTaxId
      });
      if (isErrorToRetry(err) && attempt < 3) {
        await new Promise(res => setTimeout(res, 1000));
        continue;
      }
      lastError = err;
      break;
    }
  }
  throw new Error("Error in get external Id: " + (lastError ? lastError.message : 'Unknown error'));
}

module.exports = { getCxId };
