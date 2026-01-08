import { decode, verify } from "jsonwebtoken";
import { OIDecodedIdToken, OIDecodedToken } from "../../models/Token";
import { ValidationException } from "../exception/validationException";
import { getAWSParameterStore } from "../utils/AwsParameters";
import { copyAndMaskObject } from "../utils/Object";
import { getPublicKey } from "../utils/PublicKey";

/**
 * Validate a JWT token from OneIdentity
 * @param oneIdentityIdToken - JWT token from OneIdentity (id_token)
 * @param nonce - Nonce to validate against the token payload
 * @returns The payload of the decoded token if valid
 */
export async function validateJwt(
  oneIdentityIdToken: string,
  nonce: string
): Promise<OIDecodedIdToken> {
  console.debug("Start JWT Validation");

  const decodedToken = decode(oneIdentityIdToken, {
    complete: true,
  }) as OIDecodedToken | null;

  if (!decodedToken) {
    console.warn("Decoded token is null, token is not valid");
    throw new ValidationException("Token is not valid");
  }

  // Log masked token for security
  const sensitiveFields: (keyof OIDecodedIdToken)[] = [
    "familyName",
    "name",
    "fiscalNumber",
  ];

  const decodedTokenMaskedPayload = copyAndMaskObject(
    decodedToken.payload,
    sensitiveFields
  );

  console.debug("decoded_token", {
    header: decodedToken.header,
    payload: decodedTokenMaskedPayload,
    signature: decodedToken.signature,
  });

  const { payload, header } = decodedToken;

  const { iss: issuer, aud: audience, fiscalNumber } = payload;

  const { alg, kid } = header;

  // Validate algorithm
  if (alg !== "RS256") {
    console.warn("Invalid algorithm=%s", alg);
    throw new ValidationException("Invalid algorithm");
  }

  // Validate audience
  if (!isAudienceValid(audience)) {
    console.warn("Audience=%s not known", audience);
    throw new ValidationException("Invalid Audience");
  }

  // Validate issuer
  if (!isIssuerValid(issuer)) {
    console.warn("Issuer=%s not known", issuer);
    throw new ValidationException("Issuer not known");
  }

  // Validate nonce
  if (payload.nonce !== nonce) {
    console.warn("Invalid nonce=%s", payload.nonce);
    throw new ValidationException("Invalid nonce");
  }

  // Validate tax ID
  if (!(await isTaxIdValid(fiscalNumber))) {
    console.warn("TaxId=%s not allowed", fiscalNumber);
    throw new ValidationException("TaxId not allowed");
  }

  // Verify JWT signature
  console.debug("kid from header", kid);
  try {
    const keyInPemFormat = await getPublicKey(issuer, kid);
    verify(oneIdentityIdToken, keyInPemFormat);
  } catch (err) {
    console.warn("JWT Validation error ", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    throw new ValidationException(errorMessage);
  }

  console.debug("JWT validated successfully", decodedTokenMaskedPayload);
  return payload;
}

/**
 * Check if the issuer is in the allowed list
 * @param iss - Issuer from the token
 */
export function isIssuerValid(iss: string): boolean {
  const allowedIssuersEnv = process.env.ALLOWED_ISSUER;

  if (!allowedIssuersEnv) {
    console.error("Invalid env vars ALLOWED_ISSUER", allowedIssuersEnv);
    return false;
  }

  const allowedIssuers = allowedIssuersEnv.split(",");
  return allowedIssuers.length > 0 && allowedIssuers.includes(iss);
}

/**
 * Check if the audience is in the allowed list
 * @param aud - Audience from the token
 */
export function isAudienceValid(aud: string): boolean {
  const allowedAudiencesEnv = process.env.ACCEPTED_AUDIENCE;

  if (!allowedAudiencesEnv) {
    console.error("Invalid env vars ACCEPTED_AUDIENCE", allowedAudiencesEnv);
    return false;
  }

  const allowedAudiences = allowedAudiencesEnv.split(",");
  return allowedAudiences.length > 0 && allowedAudiences.includes(aud);
}

/**
 * Check if the tax ID is allowed based on parameter store configuration.
 * If no configuration is set or is *, all tax IDs are allowed.
 * @param taxIdCode - Tax ID from the token
 */
export async function isTaxIdValid(taxIdCode?: string): Promise<boolean> {
  const allowedTaxIdsParameter = process.env.ALLOWED_TAXIDS_PARAMETER;

  // If no parameter is set, all tax IDs are allowed
  if (!allowedTaxIdsParameter) {
    return true;
  }

  try {
    const allowedTaxIdsFromStore = await getAWSParameterStore(
      allowedTaxIdsParameter
    );

    if (allowedTaxIdsFromStore.length === 0) {
      return true;
    }

    const allowedTaxIds = allowedTaxIdsFromStore.split(",");

    // Check if explicitly blocked
    if (taxIdCode && allowedTaxIds.includes(`!${taxIdCode}`)) {
      return false;
    }

    // Check wildcard (allows all)
    if (allowedTaxIds.includes("*")) {
      return true;
    }

    // Check if explicitly allowed
    return taxIdCode ? allowedTaxIds.includes(taxIdCode) : false;
  } catch (e) {
    console.log("Error retrieving allowed tax IDs from parameter store", e);
    return false;
  }
}
