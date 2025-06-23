const bunyan = ("bunyan");

function auditLog(
  message = "",
  aud_type,
  aud_orig,
  status = "",
  cx_type,
  cx_id,
  cx_role,
  uid,
  jti
) {
  let statusMessage = `INFO - ${message}`;
  if (status === "OK") {
    statusMessage = `OK - SUCCESS - ${message}`;
  }
  if (status === "KO") {
    statusMessage = `KO - FAILURE - ${message}`;
  }
  const traceId = process.env._X_AMZN_TRACE_ID;
  return bunyan.createLogger({
    name: "AUDIT_LOG",
    message: `[${aud_type}] - ${statusMessage}`,
    aud_type: aud_type,
    aud_orig: aud_orig,
    level: status === "KO" ? "ERROR" : "INFO",
    level_value: status === "KO" ? 40000 : 20000,
    logger_name: "webLogout",
    uid: uid,
    cx_type: cx_type,
    cx_id: cx_id,
    trace_id: traceId,
    tags: ["AUDIT10Y"],
    jti,
  });
}

module.exports = { auditLog };