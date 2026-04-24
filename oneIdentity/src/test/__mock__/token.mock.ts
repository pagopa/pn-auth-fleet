import {
  JwtPayload,
  OIDecodedIdToken,
  OIDecodedToken,
} from "../../models/Token";
import { mockState, tokenNonce } from "./event.mock";
import { oneIdentityClientIdMock } from "./oneIdentity.mock";

export const userIdMock = "ed84b8c9-444e-410d-80d7-cfad6aa12070";

export const oneIdentityIdTokenMock: OIDecodedIdToken = {
  iss: "https://uat.oneid.pagopa.it",
  aud: oneIdentityClientIdMock,
  fiscalNumber: "TINIT-RRRPRR50L17C282Y",
  nonce: tokenNonce,
  name: "Mario",
  familyName: "Rossi",
  pairwise: userIdMock,
  sub: "subject-12345",
  iat: 1700000000,
  exp: 1700003600,
};

export const oneIdentityDecodedTokenMock: OIDecodedToken = {
  header: { alg: "RS256", kid: "test-kid" },
  payload: oneIdentityIdTokenMock,
  signature: "test-signature",
};

// Mock JWT Payload for session token generation
export const payloadMock: JwtPayload = {
  iat: 1649686749,
  exp: 1649693949,
  uid: userIdMock,
  iss: "https://webapi.dev.notifichedigitali.it",
  aud: "webapi.dev.notifichedigitali.it",
  jti: mockState,
};
