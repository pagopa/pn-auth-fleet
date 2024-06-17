const { expect } = require("chai");
const { mockClient } = require("aws-sdk-client-mock");
const {
  KMSClient,
  SignCommand,
  DescribeKeyCommand,
  EncryptCommand,
} = require("@aws-sdk/client-kms");

const { generateToken } = require("../app/tokenGen");

const decodedToken = {
  email: "info@agid.gov.it",
  family_name: "Rossi",
  fiscal_number: "GDNNWA12H81Y874F",
  mobile_phone: "333333334",
  name: "Mario",
  from_aa: false,
  uid: "ed84b8c9-444e-410d-80d7-cfad6aa12070",
  level: "L2",
  iat: 1649686749,
  exp: 1649690349,
  aud: "portale-pf-develop.fe.dev.pn.pagopa.it",
  iss: "https://spid-hub-test.dev.pn.pagopa.it",
  jti: "01G0CFW80HGTTW0RH54WQD6F6S",
  organization: {
    id: "d0d28367-1695-4c50-a260-6fda526e9aab",
    roles: [
      {
        partyRole: "DELEGATE",
        role: "referente amministrativo",
      },
    ],
    groups: ["62a834e011a1133bef2ee384"],
    fiscal_code: "01199250158",
  },
};

describe("test tokenGen", () => {
  let kmsClientMock;

  before(() => {
    kmsClientMock = mockClient(KMSClient);
  });

  after(() => {
    kmsClientMock.reset();
  });

  it("test the token generation", async () => {
    kmsClientMock.on(DescribeKeyCommand).resolves({
      KeyMetadata: {
        KeyId: "keyId",
      },
    });
    kmsClientMock.on(EncryptCommand).resolves({
      CiphertextBlob: "encryptedToken"
    })
    // this is "signature" in bytes array
    const binarySignature = new Uint8Array([
      73,
      69,
      67,
      "6e",
      61,
      74,
      75,
      72,
      65,
    ]);
    kmsClientMock.on(SignCommand).resolves({
      KeyId: "KeyId",
      Signature: binarySignature,
      SigningAlgorithm: "RSASSA_PKCS1_V1_5_SHA_256",
    });
    const token = await generateToken(decodedToken);
    console.debug("my token", decodedToken, token);
    const base64Signature = "SUVDAD1KS0hB";
    const tokenRegexp = new RegExp(`.*\..*\.${base64Signature}`, "i");
    expect(token).to.match(tokenRegexp);
  });
});
