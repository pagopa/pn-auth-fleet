import { ValidationException } from "pn-auth-common-ts";

const AAR_PATTERN = /^[A-Za-z0-9_-]*$/;
const RETRIEVAL_ID_PATTERN = /^[ -~]{1,50}$/;

export function validateIdp(idp: string): void {
  if (idp.length > 100) {
    throw new ValidationException("Invalid idp");
  }
  try {
    new URL(idp);
  } catch {
    throw new ValidationException("Invalid idp");
  }
}

export function validateAar(aar: string): void {
  if (aar.length < 106 || aar.length > 136 || !AAR_PATTERN.test(aar)) {
    throw new ValidationException("Invalid aar");
  }
}

export function validateRetrievalId(retrievalId: string): void {
  if (retrievalId.length !== 50 || !RETRIEVAL_ID_PATTERN.test(retrievalId)) {
    throw new ValidationException("Invalid retrievalId");
  }
}
