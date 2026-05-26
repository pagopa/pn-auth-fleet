import AWSXRay from "aws-xray-sdk-core";
import http from "http";
import https from "https";

import { GetRetrievalPayloadResponse } from "../models/Source";
import { retrieveEnvVariable } from "../../../config";

AWSXRay.captureHTTPsGlobal(http);
AWSXRay.captureHTTPsGlobal(https);

import axios from "axios";

/**
 * Retrieves the payload data for a given retrieval ID from the pn-emd-integration service.
 *
 * @param retrievalId - The retrieval ID from event body
 */
export const getRetrievalPayload = async (
  retrievalId: string
): Promise<GetRetrievalPayloadResponse> => {
  const pnEmdIntegrationBaseUrl = retrieveEnvVariable(
    "PN_EMD_INTEGRATION_BASEURL"
  );

  const pnEmdIntegrationUrl = `${pnEmdIntegrationBaseUrl}/emd-integration-private/token/check-tpp?retrievalId=${retrievalId}`;

  console.log(
    "Invoking external service pn-emd-integration. Waiting Sync response.",
    {
      retrievalId: retrievalId,
      url: pnEmdIntegrationUrl,
    }
  );

  try {
    const response = await axios.get<GetRetrievalPayloadResponse>(pnEmdIntegrationUrl, {
      headers: { "Content-Type": "text/plain" },
      timeout: 2000,
    });
    return response.data;
  } catch (err) {
    console.error("External service pn-emd-integration returned errors", {
      error: err,
      url: pnEmdIntegrationUrl,
      retrievalId: retrievalId,
    });
    throw new Error("Failed to retrieve TPP payload");
  }
};
