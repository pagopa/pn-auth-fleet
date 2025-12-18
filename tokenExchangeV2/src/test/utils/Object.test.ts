import { copyAndMaskObject } from "../../app/utils/Object";
import { TokenPayload } from "../../models/Token";

describe("Object utils Tests", () => {
  describe("copyAndMaskObject", () => {
    const objectToMask: TokenPayload = {
      email: "mario.rossi@fakemail.it",
      family_name: "Rossi",
      fiscal_number: "FRMTTR76M06B715E",
      name: "Mario",
      iss: "fake-issuer",
      aud: "fake-audience",
    };

    it("checks mask object", () => {
      const sensitiveFields: (keyof typeof objectToMask)[] = [
        "email",
        "family_name",
        "fiscal_number",
        "name",
      ];
      const result = copyAndMaskObject(objectToMask, sensitiveFields);
      expect(result.email).toEqual("ma*******************it");
      expect(result.fiscal_number).toEqual("FR************5E");
      expect(result.family_name).toEqual("*****");
      expect(result.name).toEqual("*****");
      expect(result.iss).toEqual("fake-issuer");
      expect(result.aud).toEqual("fake-audience");
    });

    it("should not mask non-string fields", () => {
      const obj = {
        exp: 1696543200,
        iat: 1696539600,
        name: "Mario",
      };

      const sensitiveFields: (keyof typeof obj)[] = ["exp", "name"];
      const result = copyAndMaskObject(obj, sensitiveFields);
      expect(result.exp).toEqual(1696543200);
      expect(result.name).toEqual("*****");
    });
  });
});
