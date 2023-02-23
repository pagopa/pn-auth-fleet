const utils = require("../app/utils.js");
const expect = require("chai").expect;

const pgToken = {
  organization: {
    id: '026e8c72-7944-4dcd-8668-f596447fec6d',
    roles: [{
      partyRole: 'MANAGER',
      role: 'pg-admin'
    }],
    groups: [ '62e941d313b0fc6edad4535a' ],
    fiscal_code: '01199250158'
  }
}

const paToken = {
  organization: {
    id: '026e8c72-7944-4dcd-8668-f596447fec6d',
    roles: [{
      partyRole: 'MANAGER',
      role: 'admin'
    }],
    groups: [ '62e941d313b0fc6edad4535a' ],
    fiscal_code: '01199250158'
  }
}

describe('utils tests', () => {
  it("checks allowed origin", () => {
    const result = utils.checkOrigin('https://portale-pa-develop.fe.dev.pn.pagopa.it')

    expect(result).to.eq(0)
  })

  it("checks not allowed origin", () => {
    const result = utils.checkOrigin('https://some.website.it')

    expect(result).to.eq(-1)
  })

  it("makes keys of an object lowercase", () => {
    const result = utils.makeLower({
      A: 'val',
      B: 'val',
      C: 'val'
    })

    expect(result).to.not.have.keys('A','B','C')
    expect(result).to.have.keys('a','b','c')
  })

  it("makeLower of an empty object should be empty", () => {
    const result = utils.makeLower({})

    expect(result).to.eql({})
  })

  it("checks that user is PF type", () => {
    const result = utils.getUserType({})

    expect(result).to.eq('PF')
  })

  it("checks that user is PG type", () => {
    const result = utils.getUserType(pgToken)

    expect(result).to.eq('PG')
  })

  it("checks that user is PA type", () => {
    const result = utils.getUserType(paToken)

    expect(result).to.eq('PA')
  })

  it("enrichDecodedToken", () => {
    const result = utils.enrichDecodedToken(paToken)

    expect(result.organization.hasGroups).to.eq(true)
  })
})