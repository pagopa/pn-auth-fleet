const chaiAsPromised = require("chai-as-promised");
const chai = require("chai");

const { mockClient } = require("aws-sdk-client-mock");
const { KMSClient, GetPublicKeyCommand } = require("@aws-sdk/client-kms");

const { validation } = require("../app/validation");
const ValidationException = require("../app/exception/validationException");

chai.use(chaiAsPromised);
const expect = chai.expect;

describe("test validation", () => {
  let kmsClientMock;

  before(() => {
    kmsClientMock = mockClient(KMSClient);
    kmsClientMock.on(GetPublicKeyCommand).resolves({
      PublicKey: new Uint8Array([
        48, 130, 1, 34, 48, 13, 6, 9, 42, 134, 72, 134, 247, 13, 1, 1, 1, 5, 0,
        3, 130, 1, 15, 0, 48, 130, 1, 10, 2, 130, 1, 1, 0, 157, 34, 97, 186, 80,
        41, 131, 250, 205, 0, 88, 200, 66, 112, 98, 111, 55, 218, 63, 131, 134,
        61, 166, 109, 54, 234, 139, 118, 36, 38, 56, 76, 245, 226, 8, 110, 194,
        98, 208, 252, 119, 14, 123, 172, 87, 226, 38, 7, 191, 219, 199, 39, 187,
        111, 102, 109, 48, 27, 68, 63, 164, 241, 29, 135, 233, 218, 128, 146,
        231, 141, 246, 228, 186, 36, 84, 56, 13, 230, 44, 199, 162, 137, 139,
        184, 26, 91, 73, 87, 56, 196, 199, 154, 127, 97, 165, 29, 25, 114, 219,
        78, 126, 72, 254, 172, 166, 0, 126, 254, 106, 250, 229, 14, 191, 101,
        191, 196, 122, 202, 202, 77, 167, 188, 182, 96, 247, 189, 228, 232, 236,
        28, 115, 133, 114, 4, 150, 152, 32, 229, 85, 203, 228, 136, 17, 220,
        161, 57, 229, 234, 62, 100, 81, 64, 165, 49, 124, 215, 170, 236, 105,
        91, 142, 98, 189, 74, 80, 108, 141, 255, 119, 59, 109, 233, 51, 18, 32,
        53, 236, 96, 252, 141, 58, 61, 113, 30, 184, 224, 35, 205, 183, 227, 37,
        194, 82, 16, 145, 191, 232, 237, 1, 126, 223, 251, 100, 145, 252, 55,
        225, 253, 189, 86, 40, 193, 14, 181, 74, 53, 42, 245, 199, 212, 166,
        249, 179, 219, 57, 85, 167, 98, 204, 211, 118, 146, 18, 185, 10, 54,
        162, 173, 187, 38, 88, 237, 100, 37, 151, 2, 74, 186, 58, 241, 229, 222,
        109, 198, 251, 29, 2, 3, 1, 0, 1,
      ]),
    });
  });

  after(() => {
    kmsClientMock.reset();
  });

  it("validation without authorization token", async () => {
    await expect(validation(null)).to.be.rejectedWith(
        ValidationException,
        "token is not valid"
    );
  });

  it("validation with expired JWT token", async () => {
    await expect(
        validation(
            "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY1MTc0NzY0NiwiZXhwIjoxNjUxNzUxMjQ2LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMkE2VjBCMTNCSE5DUEVaMzJTN0tRM1kifQ.EcnBt1ZHD8Or00SgAP528lY4GcInWv3JfvtTER7_ago9Ef_patWOF1V38OZoUxKzaUrc-dZM7bQMS1PsinCcACyjZdf3D0lWiesftbBGTc221waF9vs7XOyvc1ckFSf7Qx9a1xWUPKETSqrMD7yZl7dHrWnsGLq-X_B7SQWNqd-kPFhXaD12ZYqKSRlMg35XNv2Ww491QqlzferTMBzyzUVf5JMoRjiTixdOaX420ncbRcs1jk91wiGCEqj7bTlGhQ-WIPlCcJRkLgrnj4jx6RAF8ncylfJGcp4NrIKarP82wIBglgTGZHC5TRsQbO_jFakXC8yX3Cvu8eN_T_XgPg"
        )
    ).to.be.rejectedWith(
        ValidationException, 
        JSON.stringify({"name":"TokenExpiredError", "message":"jwt expired", "expiredAt":"2022-05-05T11:47:26.000Z"})
    );
  });

  it("validation token with invalid structure", async () => {
    await expect(
      validation("eyJ0eXAiOiJhdCtqd3QiLCJhbGciOiJSUzI1NiIsInVzZSI6InNpZyIsImtpZCI6IjMyZDhhMzIxLTE1NjgtNDRmNS05NTU4LWE5MDcyZjUxOWQyZCJ9")
    ).to.be.rejectedWith(ValidationException, "Unable to decode input JWT string");
  });
});
