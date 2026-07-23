import axios from "axios";
import { ValidationException } from "pn-auth-common-ts";
import { exchangeFimsCode } from "../../app/handlers/fimsToken/utils/Fims";
import { setupEnv } from "../test.utils";

jest.mock("axios");

const postMock = axios.post as jest.Mock;
const isAxiosErrorMock = axios.isAxiosError as unknown as jest.Mock;

const fimsCredentials = { fimsClientId: "fake-client-id", fimsClientSecret: "fake-secret" };
const tokenResponse = {
  access_token: "fake-access-token",
  id_token: "fake-id-token",
  token_type: "Bearer",
  expires_in: 3600,
};

const callExchange = () =>
  exchangeFimsCode({ code: "fake-code", state: "fake-state", fimsCredentials });

describe("exchangeFimsCode", () => {
  beforeEach(() => {
    setupEnv();
    postMock.mockReset();
    isAxiosErrorMock.mockReset();
  });

  it("should POST to the FIMS token endpoint with basic auth and form body, returning the tokens", async () => {
    postMock.mockResolvedValue({ data: tokenResponse });

    const result = await callExchange();

    expect(result).toEqual(tokenResponse);

    const [url, body, config] = postMock.mock.calls[0];
    expect(url).toBe("https://oauth.io.pagopa.it/token");

    const params = new URLSearchParams(body);
    expect(params.get("grant_type")).toBe("authorization_code");
    expect(params.get("code")).toBe("fake-code");
    expect(params.get("state")).toBe("fake-state");
    expect(params.get("redirect_uri")).toBe("https://webapi.dev.notifichedigitali.it/fims/token");

    expect(config.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    const expectedBasic = Buffer.from("fake-client-id:fake-secret", "utf8").toString("base64");
    expect(config.headers.Authorization).toBe(`Basic ${expectedBasic}`);
  });

  it("should throw a ValidationException on a 400 response", async () => {
    isAxiosErrorMock.mockReturnValue(true);
    postMock.mockRejectedValue({ response: { status: 400, data: "invalid_grant" } });

    await expect(callExchange()).rejects.toThrow(ValidationException);
    await expect(callExchange()).rejects.toThrow("invalid_grant");
  });

  it("should throw a generic Error on a non-400 response", async () => {
    isAxiosErrorMock.mockReturnValue(true);
    postMock.mockRejectedValue({ response: { status: 500, data: "server_error" } });

    await expect(callExchange()).rejects.toThrow("server_error");
    await expect(callExchange()).rejects.not.toThrow(ValidationException);
  });

  it("should serialize a JSON error body instead of [object Object]", async () => {
    isAxiosErrorMock.mockReturnValue(true);
    postMock.mockRejectedValue({
      response: { status: 400, data: { error: "invalid_grant", error_description: "bad code" } },
    });

    await expect(callExchange()).rejects.toThrow('{"error":"invalid_grant","error_description":"bad code"}');
    await expect(callExchange()).rejects.not.toThrow("[object Object]");
  });

  it("should rethrow the original error for a non-axios error", async () => {
    isAxiosErrorMock.mockReturnValue(false);
    postMock.mockRejectedValue(new Error("network down"));

    await expect(callExchange()).rejects.toThrow("network down");
  });

  it("should rethrow when the axios error has no response", async () => {
    isAxiosErrorMock.mockReturnValue(true);
    const err = new Error("timeout");
    postMock.mockRejectedValue(err);

    await expect(callExchange()).rejects.toThrow("timeout");
  });
});
