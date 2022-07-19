const bunyan = require("bunyan");

module.exports =
    function auditLog(
        message = '',
        aud_type,
        aud_orig,
        status = '',
    ) {
    let statusMessage = 'INFO';
    if (status === 'OK') {
        statusMessage = `OK - SUCCESS - ${message}`;
    }
    if (status === 'KO') {
        statusMessage = `KO - FAILURE - ${message}`;
    }
    const log = bunyan.createLogger({
        name: 'AUDIT_LOG',
        message: `[${aud_type}] - ${statusMessage}`,
        aud_type: aud_type,
        aud_orig: aud_orig,
        level: 'INFO',
        logger_name: 'bunyan'
    })
    if (status === 'KO') {
        return log.error(message);
    }
    return log.info(message);
}