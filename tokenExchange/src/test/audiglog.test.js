const { expect } = require("chai");

const { auditLog } = require("../app/log.js");

const cx_type = "AUD";
const cx_id = "1111";
const cx_role = "admin";
const aud_type = "AUD_ACC_LOGTEST";
const uid = "ed84b8c9-444e-410d-80d7-cfad6aa12070";
const aud_origin = "https://portale-pf-develop.fe.dev.pn.pagopa.it";

describe("audit log test", () => {
  it("log error", function (done) {
    const logObj = auditLog({
      message: "Authorization Token not present",
      aud_type,
      aud_orig: aud_origin,
      status: "KO",
      cx_type,
      cx_id,
      cx_role,
      uid,
    });
    console.log(logObj);
    expect(logObj.fields.message).to.equal(
      "[AUD_ACC_LOGTEST] - KO - FAILURE - Authorization Token not present"
    );
    done();
  });
  it("log success", function (done) {
    const logObj = auditLog({
      message: "Authorization validated",
      aud_type,
      aud_orig: aud_origin,
      status: "OK",
      cx_type,
      cx_id,
      cx_role,
      uid,
    });
    console.log(logObj);
    expect(logObj.fields.message).to.equal(
      "[AUD_ACC_LOGTEST] - OK - SUCCESS - Authorization validated"
    );
    done();
  });
  it("log info", function (done) {
    const logObj = auditLog({
      message: "Start Token validation",
      aud_type,
      aud_orig: aud_origin,
      status: "",
      cx_type,
      cx_id,
      cx_role,
      uid,
    });
    console.log(logObj);
    expect(logObj.fields.message).to.equal(
      "[AUD_ACC_LOGTEST] - INFO - Start Token validation"
    );
    done();
  });
});
