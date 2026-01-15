import { ValidationException } from "../../app/exception/validationException";
import { exchangeOneIdentityCode } from "../../app/utils/OneIdentity";
import { oneIdentityCredentialsMock } from "../__mock__/oneIdentity.mock";
import { oneIdentityExchangeCodeResponseMock } from "../__mock__/token.mock";
import { setupEnv } from "../test.utils";

describe("One Identity tests", () => {
  const mockCode = "test_auth_code_123";
  const mockRedirectUri = "https://example.com/callback";

  const mockOneIdentityUrl = "https://uat.oneid.pagopa.it";

  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    setupEnv();
    fetchMock = jest.spyOn(global, "fetch").mockImplementation();
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it("should successfully exchange One Identity Code", async () => {
    const expectedCredentials = Buffer.from(
      `${oneIdentityCredentialsMock.oneIdentityClientId}:${oneIdentityCredentialsMock.oneIdentityClientSecret}`
    ).toString("base64");

    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue(oneIdentityExchangeCodeResponseMock),
    };

    fetchMock.mockResolvedValue(mockResponse);

    const result = await exchangeOneIdentityCode({
      code: mockCode,
      redirectUri: mockRedirectUri,
      oneIdentityCredentials: oneIdentityCredentialsMock,
    });

    expect(result).toEqual(oneIdentityExchangeCodeResponseMock);

    const fetchCall = fetchMock.mock.calls[0];
    const [url, options] = fetchCall;
    const bodyParams = new URLSearchParams(options.body);

    expect(url).toBe(`${mockOneIdentityUrl}/oidc/token`);

    expect(options.headers["Content-Type"]).toBe(
      "application/x-www-form-urlencoded"
    );
    expect(options.headers.Authorization).toBe(`Basic ${expectedCredentials}`);

    expect(bodyParams.get("code")).toBe(mockCode);
    expect(bodyParams.get("grant_type")).toBe("authorization_code");
    expect(bodyParams.get("redirect_uri")).toBe(mockRedirectUri);
  });

  it("should throw ValidationException when response status is 400", async () => {
    const mockResponse = {
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: jest.fn().mockResolvedValue("Error during code exchange"),
    };
    fetchMock.mockResolvedValue(mockResponse);

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
    const mockResponse = {
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: jest.fn().mockResolvedValue("Server error occurred"),
    };
    fetchMock.mockResolvedValue(mockResponse);

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
