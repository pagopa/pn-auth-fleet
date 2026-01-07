import * as ParameterStore from "../../app/utils/AwsParameters";
import { exchangeOneIdentityCode } from "../../app/utils/OneIdentity";
import { oneIdentityExchangeCodeResponseMock } from "../__mock__/token.mock";
import { setupEnv } from "../test.utils";

describe("One Identity tests", () => {
  const mockCode = "test_auth_code_123";
  const mockRedirectUri = "https://example.com/callback";
  const mockClientId = "one-identity-client-id";
  const mockSecret = "test_secret";
  const mockOneIdentityUrl = "https://uat.oneid.pagopa.it";

  let fetchMock: jest.SpyInstance;
  let getAWSParameterMock: jest.SpyInstance;

  beforeEach(() => {
    setupEnv();

    fetchMock = jest.spyOn(global, "fetch").mockImplementation();

    getAWSParameterMock = jest
      .spyOn(ParameterStore, "getAWSSecret")
      .mockResolvedValue(mockSecret);
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it("should successfully exchange One Identity Code", async () => {
    const expectedCredentials = Buffer.from(
      `${mockClientId}:${mockSecret}`
    ).toString("base64");

    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue(oneIdentityExchangeCodeResponseMock),
    };

    fetchMock.mockResolvedValue(mockResponse);

    const result = await exchangeOneIdentityCode(mockCode, mockRedirectUri);

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

  it("should throw error when ONE_IDENTITY_CLIENT_ID is not set", async () => {
    delete process.env.ONE_IDENTITY_CLIENT_ID;

    await expect(
      exchangeOneIdentityCode(mockCode, mockRedirectUri)
    ).rejects.toThrow("ONE_IDENTITY_CLIENT_ID is not set");
  });

  it("should throw error when ONE_IDENTITY_CLIENT_SECRET_ID is not set", async () => {
    delete process.env.ONE_IDENTITY_CLIENT_SECRET_ID;

    await expect(
      exchangeOneIdentityCode(mockCode, mockRedirectUri)
    ).rejects.toThrow("ONE_IDENTITY_CLIENT_SECRET_ID is not set");
  });

  it("should throw error when response is not ok", async () => {
    const mockResponse = {
      ok: false,
      statusText: "Bad Request",
    };
    fetchMock.mockResolvedValue(mockResponse);

    await expect(
      exchangeOneIdentityCode(mockCode, mockRedirectUri)
    ).rejects.toThrow(
      "Error during code exchange with OneIdentity: Bad Request"
    );
  });
});
