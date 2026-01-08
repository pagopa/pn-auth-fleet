import { CachedJwks, JWKS } from "../../models/Jwks";

export const jwksKid = "ce617dc9-83a9-4a4e-b060-2cdf9575f05a";

export const mockJwksResponse: JWKS = {
  keys: [
    {
      kty: "RSA",
      kid: jwksKid,
      use: "sig",
      alg: "RS256",
      n: "AMXidtlP_Z7XhdY1Y0zNyTnt6mo7chtLOro4YGqZrtEghNi6k_0giV98nN24FVDArZsfY2uSIj9qksiTGOcg2QTawyr_kLj3DIdQ6L8kuI4volMZxqkZLl0CeU72s8t58dNs2uqv4FpQv9_RPyYu3v18oUnuXV3oSAAaJj1WjoTxFib9vSlutYdsKiYm-j8xxXhu_UXb10sX8ruGziRdVGcr9fTJyv7jWG0DwLEFKyc0_52Dhs8_y8Ft7Ew94bJELoh5HqSCU_RJgp1IhwbMcuyi1V77u7s_zS9HWI-E8Sst7K4rEc3e2EhJdeZs93QJ8qOlflIYkLlWQiM5KhOnsoU=",
      e: "AQAB",
    },
  ],
};

export const mockCacheJwksResponse: CachedJwks = {
  ...mockJwksResponse,
  expiresOn: Date.now() + 3600000,
  lastUpdate: Date.now(),
};
