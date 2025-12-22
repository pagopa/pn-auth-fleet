import { decode } from "jsonwebtoken";
import { DecodedToken, TokenPayload } from "../../models/Token";
import { ValidationException } from "../exception/validationException";
import { copyAndMaskObject } from "../utils/Object";
import { getAWSParameter } from "../utils/AwsParameters";

export async function jwtValidator(jwtToken: string): Promise<TokenPayload> {
  console.debug("Start jwtValidator");

  const decodedToken = decode(jwtToken, {
    complete: true,
  }) as DecodedToken | null;

  if (!decodedToken) {
    console.warn("decoded token is null, token is not valid");
    throw new ValidationException("Token is not valid");
  }

  // Log masked token for security
  const sensitiveFields: (keyof TokenPayload)[] = [
    "email",
    "family_name",
    "fiscal_number",
    "name",
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

  const {
    iss: issuer,
    aud,
    fiscal_number: fiscalNumber,
    organization,
  } = payload;

  const { alg, kid } = header;

  const role = organization?.roles[0]?.role.replace(/pg-/, "");

  // Validate algorithm
  if (alg !== "RS256") {
    console.warn("Invalid algorithm=%s", alg);
    throw new ValidationException("Invalid algorithm");
  }

  // Validate audience
  if (!isAudienceValid(aud)) {
    console.warn("Audience=%s not known", aud);
    throw new ValidationException("Invalid Audience");
  }

  // Validate issuer
  if (!isIssuerValid(issuer)) {
    console.warn("Issuer=%s not known", issuer);
    throw new ValidationException("Issuer not known");
  }

  // Validate role (only if organization is defined)
  if (organization !== undefined && !isRoleValid(role)) {
    console.warn("Role=%s not allowed", role);
    throw new ValidationException("Role not allowed");
  }

  // Validate tax ID
  if (!(await isTaxIdValid(fiscalNumber))) {
    console.warn("TaxId=%s not allowed", fiscalNumber);
    throw new ValidationException("TaxId not allowed");
  }

  // Verify JWT signature
  // console.debug("kid from header", kid);
  // try {
  //   const keyInPemFormat = await getPublicKey(issuer, kid);
  //   verify(jwtToken, keyInPemFormat);
  // } catch (err) {
  //   const errorMessage = err instanceof Error ? err.message : "Unknown error";
  //   console.warn("Validation error ", err);
  //   throw new ValidationException(errorMessage);
  // }

  console.debug("success!");
  console.debug("payload", decodedTokenMaskedPayload);
  return payload;
}

function isIssuerValid(iss: string): boolean {
  const allowedIssuersEnv = process.env.ALLOWED_ISSUER;

  if (!allowedIssuersEnv) {
    console.error("Invalid env vars ALLOWED_ISSUER", allowedIssuersEnv);
    return false;
  }

  const allowedIssuers = allowedIssuersEnv.split(",");
  return allowedIssuers.length > 0 && allowedIssuers.includes(iss);
}

function isAudienceValid(aud: string): boolean {
  const allowedAudiencesEnv = process.env.ACCEPTED_AUDIENCE;

  if (!allowedAudiencesEnv) {
    console.error("Invalid env vars ACCEPTED_AUDIENCE", allowedAudiencesEnv);
    return false;
  }

  const allowedAudiences = allowedAudiencesEnv.split(",");
  return allowedAudiences.length > 0 && allowedAudiences.includes(aud);
}

async function isTaxIdValid(taxIdCode?: string): Promise<boolean> {
  const allowedTaxIdsParameter = process.env.ALLOWED_TAXIDS_PARAMETER;

  // If no parameter is set, all tax IDs are allowed
  if (!allowedTaxIdsParameter) {
    return true;
  }

  try {
    const allowedTaxIdsFromStore = await getAWSParameter(
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

function isRoleValid(role?: string): boolean {
  const allowedRoles = ["admin", "operator"];

  return !!role && allowedRoles.includes(role);
}
