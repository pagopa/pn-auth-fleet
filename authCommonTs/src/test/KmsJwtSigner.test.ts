import {
  DescribeKeyCommand,
  KMSClient,
  KMSClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
  SignCommand,
} from "@aws-sdk/client-kms";
import { AwsStub, mockClient } from "aws-sdk-client-mock";
import { signKmsJwt } from "../KmsJwtSigner";

const keyAlias = "SessionKey";

const payloadMock = {
  iat: 1649686749,
  exp: 1649693949,
  uid: "ed84b8c9-444e-410d-80d7-cfad6aa12070",
  iss: "https://webapi.dev.notifichedigitali.it",
  aud: "webapi.dev.pn.pagopa.it",
  jti: "01G0CFW80HGTTW0RH54WQD6F6S",
};

describe("signKmsJwt", () => {
  let kmsClientMock: AwsStub<ServiceInputTypes, ServiceOutputTypes, KMSClientResolvedConfig>;

  beforeEach(() => {
    kmsClientMock = mockClient(KMSClient);
  });

  afterEach(() => {
    kmsClientMock.reset();
    jest.restoreAllMocks();
  });

  it("should generate a valid JWT token with three base64url parts", async () => {
    kmsClientMock.on(DescribeKeyCommand).resolves({ KeyMetadata: { KeyId: "test-key-id" } });
    kmsClientMock.on(SignCommand).resolves({
      KeyId: "test-key-id",
      Signature: new Uint8Array([115, 105, 103, 110, 97, 116, 117, 114, 101]),
      SigningAlgorithm: "RSASSA_PKCS1_V1_5_SHA_256",
    });

    const token = await signKmsJwt({ payload: payloadMock, keyAlias });

    const parts = token.split(".");
    expect(parts).toHaveLength(3);
    parts.forEach((part) => expect(part).toMatch(/^[A-Za-z0-9_-]+$/));
  });

  it("should call DescribeKeyCommand with the provided alias", async () => {
    kmsClientMock.on(DescribeKeyCommand).resolves({ KeyMetadata: { KeyId: "test-key-id" } });
    kmsClientMock.on(SignCommand).resolves({ Signature: new Uint8Array([1, 2, 3]) });

    await signKmsJwt({ payload: payloadMock, keyAlias });

    expect(kmsClientMock.commandCalls(DescribeKeyCommand)).toHaveLength(1);
    expect(kmsClientMock.commandCalls(DescribeKeyCommand)[0].args[0].input).toEqual({
      KeyId: keyAlias,
    });
  });

  it("should call SignCommand with the resolved keyId and correct parameters", async () => {
    kmsClientMock.on(DescribeKeyCommand).resolves({ KeyMetadata: { KeyId: "test-key-id" } });
    kmsClientMock.on(SignCommand).resolves({ Signature: new Uint8Array([1, 2, 3]) });

    await signKmsJwt({ payload: payloadMock, keyAlias });

    const signCalls = kmsClientMock.commandCalls(SignCommand);
    expect(signCalls).toHaveLength(1);
    const signInput = signCalls[0].args[0].input;
    expect(signInput.KeyId).toBe("test-key-id");
    expect(signInput.SigningAlgorithm).toBe("RSASSA_PKCS1_V1_5_SHA_256");
    expect(signInput.MessageType).toBe("RAW");
    expect(signInput.Message).toBeInstanceOf(Buffer);
  });

  it("should throw when KMS does not return a KeyId", async () => {
    kmsClientMock.on(DescribeKeyCommand).resolves({ KeyMetadata: { KeyId: undefined } });

    await expect(signKmsJwt({ payload: payloadMock, keyAlias })).rejects.toThrow(
      "Unable to resolve KMS keyId for alias",
    );
  });

  it("should throw when KMS does not return a signature", async () => {
    kmsClientMock.on(DescribeKeyCommand).resolves({ KeyMetadata: { KeyId: "test-key-id" } });
    kmsClientMock.on(SignCommand).resolves({ KeyId: "test-key-id" });

    await expect(signKmsJwt({ payload: payloadMock, keyAlias })).rejects.toThrow(
      "KMS returned an empty signature",
    );
  });

  it("should include the correct header in the JWT", async () => {
    kmsClientMock.on(DescribeKeyCommand).resolves({ KeyMetadata: { KeyId: "test-key-id" } });
    kmsClientMock.on(SignCommand).resolves({ Signature: new Uint8Array([1, 2, 3]) });

    const token = await signKmsJwt({ payload: payloadMock, keyAlias });
    const header = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString());

    expect(header).toEqual({ alg: "RS256", typ: "JWT", kid: "test-key-id" });
  });

  it("should include the exact payload in the JWT", async () => {
    kmsClientMock.on(DescribeKeyCommand).resolves({ KeyMetadata: { KeyId: "test-key-id" } });
    kmsClientMock.on(SignCommand).resolves({ Signature: new Uint8Array([1, 2, 3]) });

    const token = await signKmsJwt({ payload: payloadMock, keyAlias });
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());

    expect(payload).toEqual(payloadMock);
  });

  it("should produce a consistent token for the same input", async () => {
    const signature = new Uint8Array([115, 105, 103, 110, 97, 116, 117, 114, 101]);
    kmsClientMock.on(DescribeKeyCommand).resolves({ KeyMetadata: { KeyId: "test-key-id" } });
    kmsClientMock.on(SignCommand).resolves({ Signature: signature });

    const token1 = await signKmsJwt({ payload: payloadMock, keyAlias });

    kmsClientMock.reset();
    kmsClientMock.on(DescribeKeyCommand).resolves({ KeyMetadata: { KeyId: "test-key-id" } });
    kmsClientMock.on(SignCommand).resolves({ Signature: signature });

    const token2 = await signKmsJwt({ payload: payloadMock, keyAlias });

    expect(token1).toBe(token2);
  });

  it("should propagate DescribeKeyCommand errors", async () => {
    kmsClientMock.on(DescribeKeyCommand).rejects(new Error("KMS service unavailable"));

    await expect(signKmsJwt({ payload: payloadMock, keyAlias })).rejects.toThrow(
      "KMS service unavailable",
    );
  });

  it("should propagate SignCommand errors", async () => {
    kmsClientMock.on(DescribeKeyCommand).resolves({ KeyMetadata: { KeyId: "test-key-id" } });
    kmsClientMock.on(SignCommand).rejects(new Error("Signing failed"));

    await expect(signKmsJwt({ payload: payloadMock, keyAlias })).rejects.toThrow("Signing failed");
  });
});
