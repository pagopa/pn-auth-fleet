export function isOriginAllowed(origin: string) {
  if (!process.env.ALLOWED_ORIGIN) {
    console.error("ALLOWED_ORIGIN env var is not set");
    return false;
  }

  const allowedOrigins = process.env.ALLOWED_ORIGIN.split(",");
  const isOriginIncluded = allowedOrigins.includes(origin);

  if (!isOriginIncluded) {
    console.error(
      "Invalid env vars ALLOWED_ORIGIN ",
      process.env.ALLOWED_ORIGIN
    );
  }

  return isOriginIncluded;
}
