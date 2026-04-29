import { oidcAuthorizeHandler as handler } from "../../../app/handlers/oidcAuthorize";
import * as AwsParameters from "../../../app/handlers/oidcToken/utils/AwsParameters";
import * as String from "../../../app/utils/String";
import { oneIdentityCredentialsMock } from "../../__mock__/oneIdentity.mock";
import { mockAllowedOrigin } from "../../__mock__/event.mock";
import { setupEnv } from "../../test.utils";

jest.mock("pn-auth-common", () => ({
  RedisHandler: {
    connectRedis: jest.fn(),
    disconnectRedis: jest.fn(),
    setJson: jest.fn(),
  },
}));

import { RedisHandler } from "pn-auth-common";

const mockIdp = "https://id.lepida.it/idp/shibboleth";
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

  it("should return 302 with correct Location header", async () => {
    const result = await handler(mockAuthorizeEvent);

    expect(result.statusCode).toBe(302);

    const expectedLocation =
      `${process.env.ONE_IDENTITY_BASEURL}/oidc/authorize` +
      `?idp=${mockIdp}` +
      `&client_id=${oneIdentityCredentialsMock.oneIdentityClientId}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(process.env.ONE_IDENTITY_REDIRECT_URI!)}` +
      `&scope=openid` +
      `&nonce=${mockNonce}` +
      `&state=${mockState}`;

    expect(result.headers?.Location).toBe(expectedLocation);
  });

  it("should save state payload to Redis with correct key and TTL", async () => {
    await handler(mockAuthorizeEvent);

    expect(RedisHandler.connectRedis).toHaveBeenCalledTimes(1);
    expect(RedisHandler.setJson).toHaveBeenCalledWith(
      `oidc::${mockState}`,
      { nonce: mockNonce, idp: mockIdp, aar: undefined, retrievalId: undefined },
      { EX: 300 },
    );
    expect(RedisHandler.disconnectRedis).toHaveBeenCalledTimes(1);
  });

  it("should include optional aar and retrievalId in Redis payload when provided", async () => {
    const eventWithOptionals = {
      ...mockAuthorizeEvent,
      queryStringParameters: { idp: mockIdp, aar: "aar-token-123", retrievalId: "retrieval-456" },
    };

    await handler(eventWithOptionals);

    expect(RedisHandler.setJson).toHaveBeenCalledWith(
      `oidc::${mockState}`,
      { nonce: mockNonce, idp: mockIdp, aar: "aar-token-123", retrievalId: "retrieval-456" },
      { EX: 300 },
    );
  });

  it("should disconnect Redis even if setJson throws", async () => {
    (RedisHandler.setJson as jest.Mock).mockRejectedValue(new Error("Redis error"));

    await expect(handler(mockAuthorizeEvent)).rejects.toThrow("Redis error");

    expect(RedisHandler.disconnectRedis).toHaveBeenCalledTimes(1);
  });

  it("should set CORS and HSTS headers on the response", async () => {
    const result = await handler(mockAuthorizeEvent);

    expect(result.headers?.["Access-Control-Allow-Origin"]).toBe(mockAllowedOrigin);
    expect(result.headers?.["Strict-Transport-Security"]).toContain("max-age=");
  });
});
