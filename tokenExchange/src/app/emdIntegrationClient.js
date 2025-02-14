const AWSXRay = require("aws-xray-sdk-core");
const http = require("http");
const https = require("https");

AWSXRay.captureHTTPsGlobal(http);
AWSXRay.captureHTTPsGlobal(https);

// the axios import must be after the xray capture, otherwise the xray tracking will not work
const axios = require("axios");
const { error } = require("console");
const { url } = require("inspector");

async function getRetrievalPayload(retrievalId) {

    const pnEmdIntegrationBaseUrl = process.env.PN_EMD_INTEGRATION_BASEURL;
    const pnEmdIntegrationUrl = pnEmdIntegrationBaseUrl + "/emd-integration-private/token/check-tpp";
    console.log("Invoking external service pn-emd-integration. Waiting Sync response.", {
        retrievalId: retrievalId,
        url: pnEmdIntegrationUrl
      })

    try {
        const response = await axios.get(pnEmdIntegrationUrl, {
            params: { retrievalId: retrievalId},
            headers: { "Content-Type": "text/plain" },
            timeout: 2000
        });
        return response.data; 
    } catch (err) {
        console.error("External service pn-emd-integration returned errors", {
            error: err,
            url: pnEmdIntegrationUrl,
            retrievalId: retrievalId
        })
        throw new Error("Error in get retrievalId");
    }

}

module.exports = { getRetrievalPayload };