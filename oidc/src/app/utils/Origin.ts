import { retrieveEnvVariable } from "../config";

export function isOriginAllowed(origin: string) {
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
