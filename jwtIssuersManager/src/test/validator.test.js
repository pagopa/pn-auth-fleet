const { expect } = require("chai");
const { validateBody }  = require("../app/validator")
const fs = require('fs');

describe("validator testing", () => {
  it("validate body OK", async () => {
    const input = JSON.parse(fs.readFileSync('src/test/resources/inputUpsert.json'));
    const result = validateBody(input)
    expect(result).is.not.undefined
    expect(result).to.be.an('array')
    expect(result.length).to.be.equal(0)
  })

  it("validate body KO missing JWKSBody", async () => {
    const input = JSON.parse(fs.readFileSync('src/test/resources/inputUpsert.json'));
    delete input['JWKSBody']
    const result = validateBody(input)
    expect(result).is.not.undefined
    expect(result).to.be.an('array')
    expect(result.length).to.be.equal(1)
  })

  it("validate body KO missing iss", async () => {
    const input = JSON.parse(fs.readFileSync('src/test/resources/inputUpsert.json'));
    delete input['iss']
    const result = validateBody(input)
    expect(result).is.not.undefined
    expect(result).to.be.an('array')
    expect(result.length).to.be.equal(1)
  })

  it("validate body KO missing actionType", async () => {
    const input = JSON.parse(fs.readFileSync('src/test/resources/inputUpsert.json'));
    delete input['actionType']
    const result = validateBody(input)
    expect(result).is.not.undefined
    expect(result).to.be.an('array')
    expect(result.length).to.be.equal(1)
  })

  it("validate body KO actionType wrong", async () => {
    const input = JSON.parse(fs.readFileSync('src/test/resources/inputUpsert.json'));
    input['actionType'] = 'UPDATE'
    const result = validateBody(input)
    expect(result).is.not.undefined
    expect(result).to.be.an('array')
    expect(result.length).to.be.equal(1)
  })
});
