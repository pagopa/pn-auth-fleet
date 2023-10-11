const { expect } = require("chai");
const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");

const {
  getParameterFromStore,
  copyAndMaskObject,
  checkOrigin,
  makeLower,
  enrichDecodedToken,
  getUserType,
} = require("../app/utils.js");

const pgToken = {
  organization: {
    id: "026e8c72-7944-4dcd-8668-f596447fec6d",
    roles: [
      {
        partyRole: "MANAGER",
        role: "pg-admin",
      },
    ],
    groups: ["62e941d313b0fc6edad4535a"],
    fiscal_code: "01199250158",
  },
};

const paToken = {
  organization: {
    id: "026e8c72-7944-4dcd-8668-f596447fec6d",
    roles: [
      {
        partyRole: "MANAGER",
        role: "admin",
      },
    ],
    groups: ["62e941d313b0fc6edad4535a"],
    fiscal_code: "01199250158",
  },
};

const objectToMask = {
  email: "mario.rossi@fakemail.it",
  family_name: "Rossi",
  fiscal_number: "FRMTTR76M06B715E",
  name: "Mario",
  notToMask: "notToMask",
};

const maskedObject = {
  email: "ma*******************it",
  family_name: "*****",
  fiscal_number: "FR************5E",
  name: "*****",
  notToMask: "notToMask",
};

describe("utils tests", () => {
  let mock;

  before(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.reset();
  });

  after(() => {
    mock.restore();
  });

  it("checks mask object", () => {
    const sensitiveFields = ["email", "family_name", "fiscal_number", "name"];
    const result = copyAndMaskObject(objectToMask, sensitiveFields);
    expect(result.email).to.eq(maskedObject.email);
    expect(result.family_name).to.eq(maskedObject.family_name);
    expect(result.name).to.eq(maskedObject.name);
    expect(result.notToMask).to.eq(maskedObject.notToMask);
  });

  it("checks allowed origin", () => {
    const result = checkOrigin(
      "https://portale-pa-develop.fe.dev.pn.pagopa.it"
    );

    expect(result).to.eq(0);
  });

  it("checks not allowed origin", () => {
    const result = checkOrigin("https://some.website.it");

    expect(result).to.eq(-1);
  });

  it("makes keys of an object lowercase", () => {
    const result = makeLower({
      A: "val",
      B: "val",
      C: "val",
    });

    expect(result).to.not.have.keys("A", "B", "C");
    expect(result).to.have.keys("a", "b", "c");
  });

  it("makeLower of an empty object should be empty", () => {
    const result = makeLower({});

    expect(result).to.eql({});
  });

  it("checks that user is PF type", () => {
    const result = getUserType({});

    expect(result).to.eq("PF");
  });

  it("checks that user is PG type", () => {
    const result = getUserType(pgToken);

    expect(result).to.eq("PG");
  });

  it("checks that user is PA type", () => {
    const result = getUserType(paToken);

    expect(result).to.eq("PA");
  });

  it("enrichDecodedToken", () => {
    const result = enrichDecodedToken(paToken);

    expect(result.organization.hasGroups).to.eq(true);
  });

  it("getParameterFromStore - success", async () => {
    const parameterName = "/fake-path/fake-param";
    mock
      .onGet(
        `http://localhost:2773/systemsmanager/parameters/get?name=${encodeURIComponent(
          parameterName
        )}`
      )
      .reply(200, JSON.stringify({ Parameter: { Value: "fake" } }));
    const result = await getParameterFromStore("/fake-path/fake-param");
    expect(result).to.eq("fake");
  });

  it("getParameterFromStore - fail", async () => {
    const parameterName = "/fake-path/fake-param";
    mock
      .onGet(
        `http://localhost:2773/systemsmanager/parameters/get?name=${encodeURIComponent(
          parameterName
        )}`
      )
      .reply(500);
    await expect(
      getParameterFromStore("/fake-path/fake-param")
    ).to.be.rejectedWith(Error, "Error in get parameter");
  });
});
