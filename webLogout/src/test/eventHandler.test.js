const jsonwebtoken = require("jsonwebtoken");
const { handleEvent } = require("../app/eventHandler"); // modifica con il path corretto
const { insertJti } = require("../app/redis");
const { auditLog } = require("../app/log");

// Mocks delle funzioni esterne
jest.mock("../app/redis", () => ({
  insertJti: jest.fn(),
}));

jest.mock("../app/log", () => ({
  auditLog: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
  })),
}));

// Mocks delle utilità
jest.mock("../app/utils", () => ({
  getCxType: jest.fn(() => "type1"),
  getCxId: jest.fn(() => "id1"),
  getCxRole: jest.fn(() => "role1"),
  getParameterFromStore: jest.fn(() => "_2fe3c8749b01acdef001,_7a11be09cf34ab982d3e"),
}));

describe("handleEvent", () => {
  const mockEvent = {
    headers: {
      origin: "https://example.com",
      authorization: "Bearer test.jwt.token",
    },
  };

  const decodedToken = {
    jti: "1234",
    uid: "user1",
    otherData: "test",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should handle successful logout", async () => {
    // mock jwt.decode per restituire un token valido
    jest.spyOn(jsonwebtoken, "decode").mockReturnValue(decodedToken);
    insertJti.mockResolvedValue();

    const response = await handleEvent(mockEvent);

    expect(jsonwebtoken.decode).toHaveBeenCalledWith("test.jwt.token");
    expect(insertJti).toHaveBeenCalledWith("1234");
    expect(auditLog).toHaveBeenCalledWith(
      `Jti 1234 was successfully inserted in Redis`,
      expect.any(String),
      "https://example.com",
      "OK",
      "type1",
      "id1",
      "role1",
      "user1",
      "1234"
    );

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ message: "Logout successful" });
  });

  it("should return 500 if token is invalid", async () => {
    jest.spyOn(jsonwebtoken, "decode").mockReturnValue(null); // token non valido

    const response = await handleEvent(mockEvent);

    expect(insertJti).not.toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith(
      `Error inserting Jti: Invalid token`,
      expect.any(String),
      "https://example.com",
      "KO"
    );
    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({
      message: "Internal Server Error",
      error: "Invalid token",
    });
  });

  it("should return 500 if insertJti throws error", async () => {
    jest.spyOn(jsonwebtoken, "decode").mockReturnValue(decodedToken);
    insertJti.mockRejectedValue(new Error("Redis failure"));

    const response = await handleEvent(mockEvent);

    expect(insertJti).toHaveBeenCalledWith("1234");
    expect(auditLog).toHaveBeenCalledWith(
      `Error inserting Jti: Redis failure`,
      expect.any(String),
      "https://example.com",
      "KO"
    );
    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({
      message: "Internal Server Error",
      error: "Redis failure",
    });
  });

  it("should skip inserting JTI if it is whitelisted", async () => {
    process.env.REDIS_JTIS_EXCLUDED_INVALIDATION = "_7a11be09cf34ab982d3e";

    jest.spyOn(jsonwebtoken, "decode").mockReturnValue({ ...decodedToken, jti: "_7a11be09cf34ab982d3e" });
    insertJti.mockResolvedValue();

    const response = await handleEvent(mockEvent);

    expect(insertJti).not.toHaveBeenCalled();
    expect(auditLog.mock.calls.length).toBe(1); // only info log

    expect(response.statusCode).toBe(200);
  });
  
  it("should always insert JTI if parameter name is empty", async () => {
    process.env.REDIS_JTIS_EXCLUDED_INVALIDATION = "";

    jest.spyOn(jsonwebtoken, "decode").mockReturnValue({ ...decodedToken, jti: "_7a11be09cf34ab982d3e" });
    insertJti.mockResolvedValue();

    const response = await handleEvent(mockEvent);

    expect(insertJti).toHaveBeenCalled();
    expect(auditLog.mock.calls[1][0]).toBe('Jti _7a11be09cf34ab982d3e was successfully inserted in Redis');

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ message: "Logout successful" });
  });
});
