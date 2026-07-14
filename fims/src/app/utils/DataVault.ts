import AWSXRay from "aws-xray-sdk-core";
import http from "http";
import https from "https";

// Capture HTTP(S) calls for X-Ray tracing (same pattern as lollipopAuthorizer).
AWSXRay.captureHTTPsGlobal(http);
AWSXRay.captureHTTPsGlobal(https);

import axios from "axios";
import { retrieveEnvVariable } from "../config";
import { maskString } from "pn-auth-common";

/**
 * Resolves the internal cx id for a physical person (PF) tax id by calling
 * pn-data-vault. The lambda runs inside the VPC (confidential subnet) to reach
 * the internal load balancer, exactly like lollipopAuthorizer.
 *
 * @param taxId - the plain tax id to anonymize and resolve
 */
// HTTP timeout (ms) for pn-data-vault calls, hardcoded like lollipopAuthorizer.
const DATA_VAULT_HTTP_TIMEOUT_MS = 2000;

export async function getCxId(taxId: string): Promise<string> {
  const baseUrl = retrieveEnvVariable("PN_DATA_VAULT_BASEURL");
  const url = `${baseUrl}/datavault-private/v1/recipients/external/PF`;

  console.log("Invoking external service pn-data-vault PF. Waiting Sync response.", {
    taxId: maskString(taxId),
    url,
  });

  try {
    const response = await axios.post<string>(url, taxId, {
      headers: { "Content-Type": "text/plain" },
      timeout: DATA_VAULT_HTTP_TIMEOUT_MS,
    });
    return response.data;
  } catch (err) {
    console.log("External service pn-data-vault PF returned errors", {
      url,
      taxId: maskString(taxId),
    });
    throw new Error("Error in get external Id");
  }
}
