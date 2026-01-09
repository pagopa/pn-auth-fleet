import { copyAndMaskObject } from "../../app/utils/Object";
import { oneIdentityIdTokenMock } from "../__mock__/token.mock";

describe("Object utils Tests", () => {
  describe("copyAndMaskObject", () => {
    it("checks mask object", () => {
      const sensitiveFields: (keyof typeof oneIdentityIdTokenMock)[] = [
        "familyName",
        "fiscalNumber",
        "name",
      ];
      const result = copyAndMaskObject(oneIdentityIdTokenMock, sensitiveFields);

      expect(result.fiscalNumber).toEqual("RR************2Y");
      expect(result.familyName).toEqual("*****");
      expect(result.name).toEqual("*****");
      expect(result.iss).toEqual("https://spid-hub-test.dev.pn.pagopa.it");
      expect(result.aud).toEqual("portale-pf-develop.fe.dev.pn.pagopa.it");
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
