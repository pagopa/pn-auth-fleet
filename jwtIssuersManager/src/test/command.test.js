const { expect } = require("chai");
const { makeCommand } = require("../app/command/index");
const fs = require('fs');
const JwtIssuerDeleteCommand = require('../app/command/JwtIssuerDeleteCommand')
const JwtIssuerUpsertCommand = require('../app/command/JwtIssuerUpsertCommand')

describe("makeCommand testing", () => {
  it("UPSERT command creation", async () => {
    const input = JSON.parse(fs.readFileSync('src/test/resources/inputUpsert.json'));
    const command = makeCommand(input)
    const mock = new JwtIssuerUpsertCommand(input)
    expect(mock).to.be.deep.equal(command)
  })

  it("DELETE command creation", async () => {
    const input = JSON.parse(fs.readFileSync('src/test/resources/inputDelete.json'));
    const command = makeCommand(input)
    const mock = new JwtIssuerDeleteCommand(input)
    expect(mock).to.be.deep.equal(command)
  })

  it("Exception", async () => {
    const input = JSON.parse(fs.readFileSync('src/test/resources/inputUpsert.json'));
    input.actionType = "NOACTION"
    let error = null;
    try {
        makeCommand(input)
    } catch (err) {
        error = err;
    }
    expect(error).to.be.not.null;
  })
});
