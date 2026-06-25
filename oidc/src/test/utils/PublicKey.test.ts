import { getJwksPublicKey } from "pn-auth-common-ts";
import { getPublicKey } from "../../app/handlers/oidcToken/utils/PublicKey";
import { setupEnv } from "../test.utils";

jest.mock("aws-xray-sdk-core", () => ({
  captureHTTPsGlobal: jest.fn(),
}));

jest.mock("pn-auth-common-ts", () => ({
  __esModule: true,
  ...jest.requireActual("pn-auth-common-ts"),
  getJwksPublicKey: jest.fn(),
}));

const mockGetJwksPublicKey = getJwksPublicKey as jest.MockedFunction<
  typeof getJwksPublicKey
>;

describe("getPublicKey", () => {
  const issuer = "https://uat.oneid.pagopa.it";
  const kid = "ce617dc9-83a9-4a4e-b060-2cdf9575f05a";
  const pemKey = "mocked-pem-key";

  beforeEach(() => {
    setupEnv();
    jest.clearAllMocks();
  });

  it("composes the JWKS URL from ONE_IDENTITY_BASEURL and delegates", async () => {
    mockGetJwksPublicKey.mockResolvedValue(pemKey);

    const result = await getPublicKey(issuer, kid);

    expect(result).toEqual(pemKey);
    expect(mockGetJwksPublicKey).toHaveBeenCalledWith({
      jwksUrl: "https://uat.oneid.pagopa.it/oidc/keys",
      issuer,
      kid,
      cacheTTL: 3600,
    });
  });

  it("propagates errors from getJwksPublicKey", async () => {
    mockGetJwksPublicKey.mockRejectedValue(new Error("boom"));

    await expect(getPublicKey(issuer, kid)).rejects.toThrow("boom");
  });
});
