import { OidcStateData } from "../../../models/OidcState";
import {
  buildSessionTokenResponse,
  removeFiscalNumberPrefix,
  SessionTokenResponse,
} from "pn-auth-common-ts";
import { Source } from "../models/Source";
import { OIDecodedIdToken } from "../models/Token";
import { generateJwtPayload, generateSessionToken } from "./TokenGenerator";

interface GenerateTokenResponseProps {
  decodedIdToken: OIDecodedIdToken;
  state: string;
  source?: Source;
  oidcStateData: OidcStateData;
}

/**
 * Generate a token exchange response compatible with SEND
 *
 * @param decodedIdToken - One Identity ID token decoded
 * @param state - The state from request body
 * @param source - The source object (optional)
 * @param oidcStateData - The OIDC state data
 */
export const generateTokenExchangeResponse = async ({
  decodedIdToken,
  state,
  source,
  oidcStateData,
}: GenerateTokenResponseProps): Promise<SessionTokenResponse> => {
  const tokenPayload = generateJwtPayload({
    pairwise: decodedIdToken.pairwise,
    state,
    source,
  });
  const sessionToken = await generateSessionToken(tokenPayload);

  return buildSessionTokenResponse({
    sessionToken,
    payload: tokenPayload,
    name: decodedIdToken.name,
    family_name: decodedIdToken.familyName,
    fiscal_number: removeFiscalNumberPrefix(decodedIdToken.fiscalNumber),
    idp: oidcStateData.idp,
    aar: oidcStateData.aar,
    retrievalId: oidcStateData.retrievalId,
  });
};

