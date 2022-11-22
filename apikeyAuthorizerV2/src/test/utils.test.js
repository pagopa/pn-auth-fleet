const { expect } = require("chai");
const utils = require("../app/utils");

it("Test anonymize function", () => {
    let text = "test-clear";
    let anonymized = utils.anonymizeKey(text);
    expect(anonymized).equals("te******ar");
});