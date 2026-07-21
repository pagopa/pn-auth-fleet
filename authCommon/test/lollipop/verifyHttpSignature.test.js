const { createSign, generateKeyPairSync } = require("node:crypto");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

const { expect } = chai;
const {
  verifyHttpSignature,
} = require("../../app/modules/lollipop/verifyHttpSignature");
const LollipopValidationError = require("../../app/modules/lollipop/LollipopValidationError");

const expectedKeyId = "expected-key-id";

function buildSignedHeaders({
  nonce = "expected-state",
  keyId = expectedKeyId,
} = {}) {
  const { publicKey, privateKey } = generateKeyPairSync("ec", {
    namedCurve: "P-256",
  });

  const publicKeyBase64 = Buffer.from(
    JSON.stringify(publicKey.export({ format: "jwk" })),
  ).toString("base64url");

  const signatureInput = `sig1=("x-pagopa-lollipop-custom-code");created=1781778934;nonce="${nonce}";alg="ecdsa-p256-sha256";keyid="${keyId}"`;

  const canonicalBase = `"x-pagopa-lollipop-custom-code": code
"@signature-params": ("x-pagopa-lollipop-custom-code");created=1781778934;nonce="${nonce}";alg="ecdsa-p256-sha256";keyid="${keyId}"`;

  const signature = createSign("SHA256")
    .update(canonicalBase)
    .end()
    .sign(privateKey)
    .toString("base64url");

  return {
    publicKeyBase64,
    headers: {
      "x-pagopa-lollipop-custom-code": "code",
      "signature-input": signatureInput,
      signature: `sig1=:${signature}:`,
    },
  };
}

describe("verifyHttpSignature", () => {
  it("verifies a FIMS HTTP signature and the signed callback header", async () => {
    const { publicKeyBase64, headers } = buildSignedHeaders();

    await expect(
      verifyHttpSignature(
        headers.signature,
        headers["signature-input"],
        headers,
        publicKeyBase64,
        "expected-state",
        expectedKeyId,
        ["x-pagopa-lollipop-custom-code"],
      ),
    ).to.eventually.equal(true);
  });

  it("rejects a signature-input nonce different from the OIDC state", async () => {
    const { publicKeyBase64, headers } = buildSignedHeaders({
      nonce: "different-state",
    });

    await expect(
      verifyHttpSignature(
        headers.signature,
        headers["signature-input"],
        headers,
        publicKeyBase64,
        "expected-state",
        expectedKeyId,
        ["x-pagopa-lollipop-custom-code"],
      ),
    )
      .to.be.rejectedWith(LollipopValidationError)
      .and.eventually.have.property("errorCode", "INVALID_SIGNATURE_NONCE");
  });

  it("rejects a callback header which is not covered by a valid signature", async () => {
    const { publicKeyBase64, headers } = buildSignedHeaders();

    await expect(
      verifyHttpSignature(
        headers.signature,
        headers["signature-input"],
        headers,
        publicKeyBase64,
        "expected-state",
        expectedKeyId,
        ["x-pagopa-lollipop-custom-state"],
      ),
    )
      .to.be.rejectedWith(LollipopValidationError)
      .and.eventually.have.property(
        "errorCode",
        "REQUIRED_SIGNED_HEADER_MISSING",
      );
  });

  it("rejects a keyid different from the expected public key thumbprint", async () => {
    const { publicKeyBase64, headers } = buildSignedHeaders({
      keyId: "different-key-id",
    });

    await expect(
      verifyHttpSignature(
        headers.signature,
        headers["signature-input"],
        headers,
        publicKeyBase64,
        "expected-state",
        expectedKeyId,
        ["x-pagopa-lollipop-custom-code"],
      ),
    )
      .to.be.rejectedWith(LollipopValidationError)
      .and.eventually.have.property("errorCode", "INVALID_SIGNATURE_KEY_ID");
  });
});
