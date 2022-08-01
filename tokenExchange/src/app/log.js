const bunyan = require("bunyan");

module.exports =
    function auditLog(
        message = '',
        aud_type,
        aud_orig,
        status = '',
        cx_type,
        cx_id,
        uid
    ) {
    let statusMessage = `INFO - ${message}`;
    if (status === 'OK') {
        statusMessage = `OK - SUCCESS - ${message}`;
    }
    if (status === 'KO') {
        statusMessage = `KO - FAILURE - ${message}`;
    }
    return bunyan.createLogger({
        name: 'AUDIT_LOG',
        message: `[${aud_type}] - ${statusMessage}`,
        aud_type: aud_type,
        aud_orig: aud_orig,
        level: status === 'KO' ? 'ERROR' : 'INFO',
        level_value: status === 'KO' ? 40000 : 20000,
        logger_name: 'tokenExchange',
        uid: uid,
        cx_type: cx_type,
        cx_id: cx_id,
        tags: [
            "AUDIT5Y"
        ]
    })
}