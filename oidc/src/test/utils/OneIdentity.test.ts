import axios, { AxiosError } from "axios";
import { ValidationException } from "pn-auth-common-ts";
import { exchangeOneIdentityCode } from "../../app/handlers/oidcToken/utils/OneIdentity";
import {
  oneIdentityCredentialsMock,
  oneIdentityExchangeCodeResponseMock,
} from "../__mock__/oneIdentity.mock";
import { setupEnv } from "../test.utils";

describe("One Identity tests", () => {
  const mockCode = "test_auth_code_123";
  const mockRedirectUri = "https://example.com/callback";
  const mockOneIdentityUrl = "https://uat.oneid.pagopa.it";

  let postMock: jest.SpyInstance;

  beforeEach(() => {
    setupEnv();
    postMock = jest.spyOn(axios, "post").mockImplementation(jest.fn());
  });

  afterEach(() => {
    postMock.mockRestore();
  });

  it("should successfully exchange One Identity Code", async () => {
    const expectedCredentials = Buffer.from(
      `${oneIdentityCredentialsMock.oneIdentityClientId}:${oneIdentityCredentialsMock.oneIdentityClientSecret}`
    ).toString("base64");

    postMock.mockResolvedValue({ data: oneIdentityExchangeCodeResponseMock });

    const result = await exchangeOneIdentityCode({
      code: mockCode,
      redirectUri: mockRedirectUri,
      oneIdentityCredentials: oneIdentityCredentialsMock,
    });

    expect(result).toEqual(oneIdentityExchangeCodeResponseMock);

    const [url, body, config] = postMock.mock.calls[0] as [string, string, any];
    const bodyParams = new URLSearchParams(body);

    expect(url).toBe(`${mockOneIdentityUrl}/oidc/token`);
    expect(config.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(config.headers.Authorization).toBe(`Basic ${expectedCredentials}`);
    expect(bodyParams.get("code")).toBe(mockCode);
    expect(bodyParams.get("grant_type")).toBe("authorization_code");
    expect(bodyParams.get("redirect_uri")).toBe(mockRedirectUri);
  });

  it("should throw ValidationException when response status is 400", async () => {
    const error = new AxiosError(
      "Bad Request",
      "400",
      undefined,
      undefined,
      { status: 400, statusText: "Bad Request", data: "Error during code exchange", headers: {}, config: {} as any }
    );
    postMock.mockRejectedValue(error);

    await expect(
      exchangeOneIdentityCode({
        code: mockCode,
        redirectUri: mockRedirectUri,
        oneIdentityCredentials: oneIdentityCredentialsMock,
      })
    ).rejects.toThrow(
      new ValidationException(
        "Error during code exchange with OneIdentity: Error during code exchange"
      )
    );
  });

  it("should throw generic Error when response status is not 400 (e.g., 500)", async () => {
    const error = new AxiosError(
      "Internal Server Error",
      "500",
      undefined,
      undefined,
      { status: 500, statusText: "Internal Server Error", data: "Server error occurred", headers: {}, config: {} as any }
    );
    postMock.mockRejectedValue(error);

    await expect(
      exchangeOneIdentityCode({
        code: mockCode,
        redirectUri: mockRedirectUri,
        oneIdentityCredentials: oneIdentityCredentialsMock,
      })
    ).rejects.toThrow(
      new Error(
        "Error during code exchange with OneIdentity: Server error occurred"
      )
    );

    postMock.mockRejectedValue(error);

    await expect(
      exchangeOneIdentityCode({
        code: mockCode,
        redirectUri: mockRedirectUri,
        oneIdentityCredentials: oneIdentityCredentialsMock,
      })
    ).rejects.not.toThrow(ValidationException);
  });

  it("should throw error if ONE_IDENTITY_BASEURL is not set", async () => {
    delete process.env.ONE_IDENTITY_BASEURL;

    await expect(
      exchangeOneIdentityCode({
        code: mockCode,
        redirectUri: mockRedirectUri,
        oneIdentityCredentials: oneIdentityCredentialsMock,
      })
    ).rejects.toThrow(new Error("ONE_IDENTITY_BASEURL is not set"));
  });
});
