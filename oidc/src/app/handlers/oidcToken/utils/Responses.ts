import { OidcStateData } from "../../../models/OidcState";
import { removeFiscalNumberPrefix } from "../../../utils/String";
import { Source } from "../models/Source";
import { OIDecodedIdToken, TokenExchangeResponse } from "../models/Token";
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
}: GenerateTokenResponseProps): Promise<TokenExchangeResponse> => {
  const tokenPayload = generateJwtPayload({
    pairwise: decodedIdToken.pairwise,
    state,
    source,
  });
  const sessionToken = await generateSessionToken(tokenPayload);

  return {
    sessionToken,
    name: decodedIdToken.name,
    family_name: decodedIdToken.familyName,
    uid: decodedIdToken.pairwise,
    fiscal_number: removeFiscalNumberPrefix(decodedIdToken.fiscalNumber),
    from_aa: false,
    level: "L2",
    aud: tokenPayload.aud,
    iat: tokenPayload.iat,
    exp: tokenPayload.exp,
    iss: tokenPayload.iss,
    jti: state,
    source,
    idp: oidcStateData.idp,
    aar: oidcStateData.aar,
    retrievalId: oidcStateData.retrievalId,
  };
};

