import { auditLog } from "../../app/utils/AuditLog";

describe("Audit Log", () => {
  const cx_type = "AUD";
  const cx_id = "1111";
  const uid = "ed84b8c9-444e-410d-80d7-cfad6aa12070";
  const aud_origin = "https://portale-pf-develop.fe.dev.pn.pagopa.it";

  it("should log error correctly", () => {
    const msg = "Authorization Token not present";
    const status = "KO";
    const logObj = auditLog({
      message: msg,
      aud_orig: aud_origin,
      status,
      cx_type,
      cx_id,
      uid,
    });

    expect(logObj.fields.message).toBe(
      "[AUD_ACC_LOGIN] - KO - FAILURE - Authorization Token not present"
    );
  });

  it("should log success correctly", () => {
    const msg = "Authorization validated";
    const status = "OK";
    const logObj = auditLog({
      message: msg,
      aud_orig: aud_origin,
      status,
      cx_type,
      cx_id,
      uid,
    });

    expect(logObj.fields.message).toBe(
      "[AUD_ACC_LOGIN] - OK - SUCCESS - Authorization validated"
    );
  });

  it("should log info correctly", () => {
    const msg = "Start Token validation";
    const logObj = auditLog({
      message: msg,
      aud_orig: aud_origin,
      cx_type,
      cx_id,
      uid,
    });

    expect(logObj.fields.message).toBe(
      "[AUD_ACC_LOGIN] - INFO - Start Token validation"
    );
  });

  // it.only("test", () => {
  //   auditLog({
  //     message: "Origin not allowed",
  //     aud_orig: "cioa",
  //     status: "KO",
  //   }).error("Errore custom");
  // });
});
