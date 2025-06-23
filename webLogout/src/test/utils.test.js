const { getCxType, getCxId, getCxRole } = require("../app/utils");

describe("getCxType", () => {
  it("should return 'PA' when token has organization", async () => {
    const token = { organization: { id: "123", roles: [{ role: "pg-admin" }] } };
    const result = await getCxType(token);
    expect(result).to.equal("PA");
  });

  it("should return 'PG' when token.organization.roles[0].role starts with 'pg-'", async () => {
    const token = { organization: { roles: [{ role: "pg-manager" }] } };
    // Remove organization property to test the second condition
    delete token.organization.id;
    const result = await getCxType(token);
    expect(result).to.equal("PG");
  });

  it("should return 'PF' when token has no organization", async () => {
    const token = { uid: "user-1" };
    const result = await getCxType(token);
    expect(result).to.equal("PF");
  });

  it("should return 'PF' when token.organization.roles is undefined", async () => {
    const token = { organization: {} };
    const result = await getCxType(token);
    expect(result).to.equal("PF");
  });
});

describe("getCxId", () => {
  it("should return organization id if present", async () => {
    const token = { organization: { id: "org-123" }, uid: "user-1" };
    const result = await getCxId(token);
    expect(result).to.equal("org-123");
  });

  it("should return 'PF-' + uid if organization is missing", async () => {
    const token = { uid: "user-2" };
    const result = await getCxId(token);
    expect(result).to.equal("PF-user-2");
  });
});

// Tests for getCxType, getCxId, getCxRole

describe("getCxType", () => {
  it("should return 'PA' when token has organization", async () => {
    const token = { organization: { id: "123", roles: [{ role: "pg-admin" }] } };
    const result = await getCxType(token);
    expect(result).to.equal("PA");
  });

  it("should return 'PG' when token.organization.roles[0].role starts with 'pg-'", async () => {
    const token = { organization: { roles: [{ role: "pg-manager" }] } };
    // Remove organization property to test the second condition
    delete token.organization.id;
    const result = await getCxType(token);
    expect(result).to.equal("PG");
  });

  it("should return 'PF' when token has no organization", async () => {
    const token = { uid: "user-1" };
    const result = await getCxType(token);
    expect(result).to.equal("PF");
  });

  it("should return 'PF' when token.organization.roles is undefined", async () => {
    const token = { organization: {} };
    const result = await getCxType(token);
    expect(result).to.equal("PF");
  });
});

describe("getCxId", () => {
  it("should return organization id if present", async () => {
    const token = { organization: { id: "org-123" }, uid: "user-1" };
    const result = await getCxId(token);
    expect(result).to.equal("org-123");
  });

  it("should return 'PF-' + uid if organization is missing", async () => {
    const token = { uid: "user-2" };
    const result = await getCxId(token);
    expect(result).to.equal("PF-user-2");
  });
});

describe("getCxRole", () => {
  it("should return the role if present", async () => {
    const token = { organization: { roles: [{ role: "pg-admin" }] } };
    const result = await getCxRole(token);
    expect(result).to.equal("pg-admin");
  });
});
