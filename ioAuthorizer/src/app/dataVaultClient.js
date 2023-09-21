import AWSXRay from "aws-xray-sdk-core";
import axios from "axios";
import http from "http";
import https from "https";

AWSXRay.captureHTTPsGlobal(http);
AWSXRay.captureHTTPsGlobal(https);

const getCxId = async (taxId) => {
  const pnDataVaultBaseUrl = process.env.PN_DATA_VAULT_BASEURL;
  const pnDataVaultUrl =
    pnDataVaultBaseUrl + "/datavault-private/v1/recipients/external/PF";
  try {
    let response = await axios.post(pnDataVaultUrl, taxId, {
      headers: { "Content-Type": "text/plain" },
      timeout: 2000,
    });
    return response.data;
  } catch (err) {
    console.error("Error in get external Id ", err);
    throw new Error("Error in get external Id");
  }
};

export { getCxId };
