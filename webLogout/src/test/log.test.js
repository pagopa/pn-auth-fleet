const { expect } = require("@jest/globals");
const { auditLog } = require("../app/log.js");

const cx_type = "AUD";
const cx_id = "1111";
const cx_role = "admin";
const aud_type = "AUD_ACC_LOGTEST";
const uid = "ed84b8c9-444e-410d-80d7-cfad6aa12070";
const aud_origin = "https://portale-pf-develop.fe.dev.pn.pagopa.it";

describe("audit log test", () => {
  it("log error", function (done) {
    const msg = "Error message";
    const status = "KO";
    const logObj = auditLog(
      msg,
      aud_type,
      aud_origin,
      status,
      cx_type,
      cx_id,
      cx_role,
      uid
    );
    expect(logObj.fields.message).toEqual(
      "[AUD_ACC_LOGTEST] - KO - FAILURE - Error message"
    );
    done();
  });
  it("log success", function (done) {
    const msg = "Success message";
    const status = "OK";
    const logObj = auditLog(
      msg,
      aud_type,
      aud_origin,
      status,
      cx_type,
      cx_id,
      cx_role,
      uid
    );
    expect(logObj.fields.message).toEqual(
      "[AUD_ACC_LOGTEST] - OK - SUCCESS - Success message"
    );
    done();
  });
  it("log info", function (done) {
    const msg = "Info message";
    const status = "";
    const logObj = auditLog(
      msg,
      aud_type,
      aud_origin,
      status,
      cx_type,
      cx_id,
      cx_role,
      uid
    );
    expect(logObj.fields.message).toEqual(
      "[AUD_ACC_LOGTEST] - INFO - Info message"
    );
    done();
  });
});
