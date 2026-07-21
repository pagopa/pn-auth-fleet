import { retrieveEnvVariable } from "../config";

// Checks the request Origin against the comma-separated ALLOWED_ORIGIN list.
// Used only by the browser-facing /exchange endpoint.
export function isOriginAllowed(origin: string): boolean {
  const allowedOriginEnv = retrieveEnvVariable("ALLOWED_ORIGIN", "");

  if (!allowedOriginEnv) {
    console.error("ALLOWED_ORIGIN env var is not set");
    return false;
  }

  const allowedOrigins = allowedOriginEnv.split(",");
  const isOriginIncluded = allowedOrigins.includes(origin);

  if (!isOriginIncluded) {
    console.error(`Origin: ${origin} is not allowed`);
  }

  return isOriginIncluded;
}
