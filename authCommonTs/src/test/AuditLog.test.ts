import { createAuditLogger } from "../AuditLog";

describe("Audit Log", () => {
  const auditLog = createAuditLogger("test-logger");
  const cx_type = "AUD";
  const cx_id = "1111";
  const uid = "ed84b8c9-444e-410d-80d7-cfad6aa12070";
  const aud_origin = "https://portale-pf-develop.fe.dev.pn.pagopa.it";
  const request_id = "mock-aws-request-id";

  it("should log error correctly", () => {
    const logObj = auditLog({
      message: "Authorization Token not present",
      aud_orig: aud_origin,
      status: "KO",
      cx_type,
      cx_id,
      uid,
      request_id,
    });

    expect(logObj.fields.message).toBe(
      "[AUD_ACC_LOGIN] - KO - FAILURE - Authorization Token not present"
    );
    expect(logObj.fields.logger_name).toBe("test-logger");
  });

  it("should log success correctly", () => {
    const logObj = auditLog({
      message: "Authorization validated",
      aud_orig: aud_origin,
      status: "OK",
      cx_type,
      cx_id,
      uid,
      request_id,
    });

    expect(logObj.fields.message).toBe(
      "[AUD_ACC_LOGIN] - OK - SUCCESS - Authorization validated"
    );
  });

  it("should log info correctly", () => {
    const logObj = auditLog({
      message: "Start Token validation",
      aud_orig: aud_origin,
      cx_type,
      cx_id,
      uid,
      request_id,
    });

    expect(logObj.fields.message).toBe(
      "[AUD_ACC_LOGIN] - INFO - Start Token validation"
    );
  });

  it("should bind a different logger_name per logger", () => {
    const otherLogger = createAuditLogger("another");
    const logObj = otherLogger({ request_id });
    expect(logObj.fields.logger_name).toBe("another");
  });
});
