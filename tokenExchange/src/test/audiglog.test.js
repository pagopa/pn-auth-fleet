
const auditLog = require("../app/log.js");
describe('log error', () => {
    const aud_type = "AUD_ACC_LOGTEST";
    const uid = "ed84b8c9-444e-410d-80d7-cfad6aa12070";
    const aud_origin = "https://portale-pf-develop.fe.dev.pn.pagopa.it";
    const msg = "Authorization Token not present";
    const status = "KO";
    const cx_type = "AUD";
    const cx_id = "1111";
    auditLog(msg,aud_type,aud_origin,status,cx_type,cx_id,uid);
});

describe('log success', () => {
    const aud_type = "AUD_ACC_LOGTEST";
    const uid = "ed84b8c9-444e-410d-80d7-cfad6aa12070";
    const aud_origin = "https://portale-pf-develop.fe.dev.pn.pagopa.it";
    const msg = "Authorization validated";
    const status = "OK";
    const cx_type = "AUD";
    const cx_id = "1111";
    auditLog(msg,aud_type,aud_origin,status,cx_type,cx_id,uid);
});

describe('log info', () => {
    const aud_type = "AUD_ACC_LOGTEST";
    const uid = "ed84b8c9-444e-410d-80d7-cfad6aa12070";
    const aud_origin = "https://portale-pf-develop.fe.dev.pn.pagopa.it";
    const msg = "Authorization Token not present";
    const status = "";
    const cx_type = "AUD";
    const cx_id = "1111";
    auditLog(msg,aud_type,aud_origin,status,cx_type,cx_id,uid);
});