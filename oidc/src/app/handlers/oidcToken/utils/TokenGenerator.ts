import { signKmsJwt, SessionTokenPayload } from "pn-auth-common-ts";
import { Source, SourceChannel } from "../models/Source";
import { getRetrievalPayload } from "./EmdIntegrationClient";
import { retrieveEnvVariable } from "../../../config";
import { OidcStateData } from "../../../models/OidcState";

interface GenerateJwtPayloadProps {
  pairwise: string;
  state: string;
  source?: Source;
}

/**
 * Generate a Session Token
 *
 * @param payload - The Session Token JWT Payload
 */
export const generateSessionToken = async (
  payload: SessionTokenPayload,
): Promise<string> => {
  const keyAlias = retrieveEnvVariable("KEY_ALIAS");
  return signKmsJwt({ payload: { ...payload }, keyAlias });
};

/**
 * Generate JWT payload
 *
 * @param pairwise - The pairwise from OI decoded token
 * @param state - The state from request body
 * @param source - The source event from request body
 */
export const generateJwtPayload = ({
  pairwise,
  state,
  source,
}: GenerateJwtPayloadProps): SessionTokenPayload => {
  const issuer = retrieveEnvVariable("ISSUER");
  const audience = retrieveEnvVariable("AUDIENCE");
  const expDate = getExpDate();

  return {
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(expDate.getTime() / 1000),
    uid: pairwise,
    iss: issuer,
    aud: audience,
    jti: state,
    ...(source && { source }),
  };
};

export const generateSourceObject = async (
  stateData?: OidcStateData,
): Promise<Source | undefined> => {
  if (stateData?.retrievalId) {
    const payload = await getRetrievalPayload(stateData.retrievalId);
    return {
      channel: SourceChannel.TPP,
      details: payload.tppId,
      retrievalId: stateData.retrievalId,
    };
  }

  if (stateData?.aar) {
    return {
      channel: SourceChannel.WEB,
      details: "QR_CODE",
    };
  }

  return undefined;
};

/**
 * Calculates the expiration date for the session token
 */
const getExpDate = () => {
  const secondsToAdd = retrieveEnvVariable("TOKEN_TTL");
  const expDate = Date.now() + Number(secondsToAdd) * 1000;
  return new Date(expDate);
};
