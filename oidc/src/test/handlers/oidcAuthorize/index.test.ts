import { oidcAuthorizeHandler as handler } from "../../../app/handlers/oidcAuthorize";
import * as AwsParameters from "../../../app/handlers/oidcToken/utils/AwsParameters";
import * as String from "../../../app/utils/String";
import { oneIdentityCredentialsMock } from "../../__mock__/oneIdentity.mock";
import { mockAllowedOrigin, mockContext } from "../../__mock__/event.mock";
import { setupEnv } from "../../test.utils";

jest.mock("pn-auth-common", () => ({
  RedisHandler: {
    connectRedis: jest.fn(),
    disconnectRedis: jest.fn(),
    setJson: jest.fn(),
  },
  COMMON_CONSTANTS: {
    REDIS_PN_SESSION_PREFIX: "pn-session::",
  },
}));

import { RedisHandler } from "pn-auth-common";

const mockIdp = "https://id.lepida.it/idp/shibboleth";
const mockAar = "A".repeat(106);
const mockRetrievalId = "a".repeat(50);
const mockState = "generated-state-uuid";
const mockNonce = "generated-nonce-uuid";

const mockAuthorizeEvent = {
  headers: { origin: mockAllowedOrigin },
  queryStringParameters: { idp: mockIdp },
} as any;

describe("oidcAuthorize handler", () => {
  let getAWSSecretSpy: jest.SpyInstance;
  let generateRandomUniqueStringSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetAllMocks();
    setupEnv();

    getAWSSecretSpy = jest
      .spyOn(AwsParameters, "getAWSSecret")
      .mockResolvedValue(oneIdentityCredentialsMock as any);

    generateRandomUniqueStringSpy = jest
      .spyOn(String, "generateRandomUniqueString")
      .mockReturnValueOnce(mockState)
      .mockReturnValueOnce(mockNonce);
  });

  afterEach(() => {
    getAWSSecretSpy.mockRestore();
    generateRandomUniqueStringSpy.mockRestore();
  });

  it("should return 200 with correct location in body", async () => {
    const result = await handler(mockAuthorizeEvent, mockContext);

    expect(result.statusCode).toBe(200);

    const expectedLocation =
      `${process.env.ONE_IDENTITY_BASEURL}/oidc/authorize` +
      `?idp=${encodeURIComponent(mockIdp)}` +
      `&client_id=${oneIdentityCredentialsMock.oneIdentityClientId}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(process.env.ONE_IDENTITY_REDIRECT_URI!)}` +
      `&scope=openid` +
      `&nonce=${mockNonce}` +
      `&state=${mockState}`;

    expect(JSON.parse(result.body).location).toBe(expectedLocation);
  });

  it("should save state payload to Redis with correct key and TTL", async () => {
    await handler(mockAuthorizeEvent, mockContext);

    expect(RedisHandler.connectRedis).toHaveBeenCalledTimes(1);
    expect(RedisHandler.setJson).toHaveBeenCalledWith(
      `pn-session::oidc::${mockState}`,
      { nonce: mockNonce, idp: mockIdp, aar: undefined, retrievalId: undefined },
      { EX: 300 },
    );
    expect(RedisHandler.disconnectRedis).toHaveBeenCalledTimes(1);
  });

  it("should include optional aar and retrievalId in Redis payload when provided", async () => {
    const eventWithOptionals = {
      ...mockAuthorizeEvent,
      queryStringParameters: { idp: mockIdp, aar: mockAar, retrievalId: mockRetrievalId },
    };

    await handler(eventWithOptionals, mockContext);

    expect(RedisHandler.setJson).toHaveBeenCalledWith(
      `pn-session::oidc::${mockState}`,
      { nonce: mockNonce, idp: mockIdp, aar: mockAar, retrievalId: mockRetrievalId },
      { EX: 300 },
    );
  });

  it("should disconnect Redis even if setJson throws", async () => {
    (RedisHandler.setJson as jest.Mock).mockRejectedValue(new Error("Redis error"));

    await expect(handler(mockAuthorizeEvent, mockContext)).rejects.toThrow("Redis error");

    expect(RedisHandler.disconnectRedis).toHaveBeenCalledTimes(1);
  });

  it("should set CORS and HSTS headers on the response", async () => {
    const result = await handler(mockAuthorizeEvent, mockContext);

    expect(result.headers?.["Access-Control-Allow-Origin"]).toBe(mockAllowedOrigin);
    expect(result.headers?.["Strict-Transport-Security"]).toContain("max-age=");
  });
});
