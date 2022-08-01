
const auditLog = require("../app/log.js");
const expect = require("chai").expect;
const cx_type = "AUD";
const cx_id = "1111";
const aud_type = "AUD_ACC_LOGTEST";
const uid = "ed84b8c9-444e-410d-80d7-cfad6aa12070";
const aud_origin = "https://portale-pf-develop.fe.dev.pn.pagopa.it";

describe('audit log test', () => {
    it("log error", function (done) {
        const msg = "Authorization Token not present";
        const status = "KO";
        const logObj = auditLog(msg, aud_type, aud_origin, status, cx_type, cx_id, uid);
        console.log(logObj);
        expect(logObj.fields.message).to.equal('[AUD_ACC_LOGTEST] - KO - FAILURE - Authorization Token not present');
        done();
    });
    it("log success", function (done) {
        const msg = "Authorization validated";
        const status = "OK";
        const logObj = auditLog(msg, aud_type, aud_origin, status, cx_type, cx_id, uid);
        console.log(logObj);
        expect(logObj.fields.message).to.equal('[AUD_ACC_LOGTEST] - OK - SUCCESS - Authorization validated');
        done();
    });
    it("log info", function (done) {
        const msg = "Start Token validation";
        const status = "";
        const logObj = auditLog(msg, aud_type, aud_origin, status, cx_type, cx_id, uid);
        console.log(logObj);
        expect(logObj.fields.message).to.equal('[AUD_ACC_LOGTEST] - INFO - Start Token validation');
        done();
    });
});
