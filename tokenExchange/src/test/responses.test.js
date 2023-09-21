const responses = require("../app/responses.js");
const { ValidationException } = require("../app/exception/validationException");
const expect = require("chai").expect;

const sessionToken = "a.b.c";

const decodedToken = {
  testKey: "testValue",
  testKey2: "testValue2",
};
const origin = "origin";

const okResponse = {
  statusCode: 200,
  headers: {
    "Access-Control-Allow-Origin": origin,
  },
  body: JSON.stringify({ ...decodedToken, sessionToken }),
  isBase64Encoded: false,
};

const makeKoResponse = (message, statusCode) => ({
  statusCode,
  body: JSON.stringify({
    error: message,
    status: statusCode,
    traceId: "my_trace_id",
  }),
  headers: {
    "Access-Control-Allow-Origin": origin,
  },
  isBase64Encoded: false,
});

describe("responses tests", () => {
  it("generateOkResponse", () => {
    const result = responses.generateOkResponse(
      sessionToken,
      decodedToken,
      origin
    );

    expect(result).to.eql(okResponse);
  });

  it("generateKoResponse Role not allowed", () => {
    const result = responses.generateKoResponse(
      new ValidationException("Role not allowed"),
      origin
    );

    expect(result).to.eql(makeKoResponse("Role not allowed", 403));
  });

  it("generateKoResponse TaxId not allowed", () => {
    const result = responses.generateKoResponse(
      new ValidationException("TaxId not allowed"),
      origin
    );

    expect(result).to.eql(makeKoResponse("TaxId not allowed", 451));
  });

  it("generateKoResponse Issuer not known", () => {
    const result = responses.generateKoResponse(
      new ValidationException("Issuer not known"),
      origin
    );

    expect(result).to.eql(makeKoResponse("Issuer not known", 400));
  });

  it("generateKoResponse Invalid Audience", () => {
    const result = responses.generateKoResponse(
      new ValidationException("Invalid Audience"),
      origin
    );

    expect(result).to.eql(makeKoResponse("Invalid Audience", 400));
  });

  it("generateKoResponse Token is not valid", () => {
    const result = responses.generateKoResponse(
      new ValidationException("Token is not valid"),
      origin
    );

    expect(result).to.eql(makeKoResponse("Token is not valid", 400));
  });
});
