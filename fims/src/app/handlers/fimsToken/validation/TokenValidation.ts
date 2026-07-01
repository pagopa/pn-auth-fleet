import { decode, verify } from "jsonwebtoken";
import { ValidationException } from "pn-auth-common-ts";
import { FimsDecodedIdToken, FimsDecodedToken } from "../models/Token";
import { getPublicKey } from "../utils/PublicKey";
import { retrieveEnvVariable } from "../../../config";

type ValidateFimsIdTokenProps = {
  fimsIdToken: string;
  nonce: string;
  fimsClientId: string;
};

export async function validateFimsIdToken({
  fimsIdToken,
  nonce,
  fimsClientId,
}: ValidateFimsIdTokenProps): Promise<FimsDecodedIdToken> {
  console.debug("Start JWT Validation");

  const decodedToken = decode(fimsIdToken, {
    complete: true,
  }) as FimsDecodedToken | null;

  if (!decodedToken) {
    console.warn("Decoded token is null, token is not valid");
    throw new ValidationException("Token is not valid");
  }

  const { payload, header } = decodedToken;

  const { iss: issuer, aud: audience } = payload;

  const { alg, kid } = header;

  if (alg !== "RS256") {
    console.warn("Invalid algorithm=%s", alg);
    throw new ValidationException("Invalid algorithm");
  }

  const fimsIssuerUrl = retrieveEnvVariable("FIMS_ISSUER_URL");
  if (issuer !== fimsIssuerUrl) {
    console.warn("Issuer=%s not known", issuer);
    throw new ValidationException("Issuer not known");
  }

  if (audience !== fimsClientId) {
    console.warn("Audience=%s not known", audience);
    throw new ValidationException("Invalid Audience");
  }

  if (payload.nonce !== nonce) {
    console.warn("Invalid nonce=%s", payload.nonce);
    throw new ValidationException("Invalid nonce");
  }

  try {
    const keyInPemFormat = await getPublicKey(issuer, kid);
    verify(fimsIdToken, keyInPemFormat);
  } catch (err) {
    console.warn("JWT Validation error ", err);
    const errorMessage =
      err instanceof Error ? err.message : "JWT verification failed";
    throw new ValidationException(errorMessage);
  }

  console.debug("JWT validated successfully");
  return payload;
}
