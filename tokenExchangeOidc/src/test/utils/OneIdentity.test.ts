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

  it("should throw error when response is not ok", async () => {
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
});
