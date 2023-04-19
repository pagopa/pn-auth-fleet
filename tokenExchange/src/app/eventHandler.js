const validator = require('./validation.js');
const tokenGen = require('./tokenGen.js');
const responses = require('./responses.js');
const auditLog = require("./log.js");
const utils = require("./utils.js");

module.exports = {
    async handleEvent(event, context){
        const awsAccountId = context?.invokedFunctionArn?.split(":")[4];
        console.log("AWS Account ID", awsAccountId);
        const isDev = awsAccountId === "558518206506";

        event.headers = utils.makeLower(event.headers);
        const eventOrigin = event?.headers?.origin;
        if (eventOrigin) {
            auditLog('', 'AUD_ACC_LOGIN', eventOrigin).info('info');
            if (utils.checkOrigin( eventOrigin ) !== -1) {
                console.info('Origin successful checked');
                // retrieve token
                let encodedToken;
                try {
                    const requestBody = JSON.parse(event?.body);
                    encodedToken = requestBody?.authorizationToken;
                } catch (err) {
                    auditLog(`Error generating token ${err.message}`,'AUD_ACC_LOGIN', eventOrigin, 'KO').error("error");
                    return responses.generateKoResponse(err, eventOrigin);
                }
                if (encodedToken) {
                    try {
                        const decodedToken = await validator.validation(encodedToken);
                        const enrichedToken = utils.enrichDecodedToken(decodedToken);
                        const sessionToken = await tokenGen.generateToken(enrichedToken, isDev);
                        const uid = enrichedToken.uid;
                        const cx_id = enrichedToken.organization ? enrichedToken.organization.id : ('PF-' + enrichedToken.uid);
                        const cx_type = utils.getUserType(enrichedToken);
                        const cx_role = enrichedToken.organization?.roles[0]?.role
                        auditLog(`Token successful generated with id ${enrichedToken.jti}`, 'AUD_ACC_LOGIN', eventOrigin, 'OK', cx_type, cx_id, cx_role, uid, enrichedToken.jti).info('success');
                        return responses.generateOkResponse(sessionToken, enrichedToken, eventOrigin);
                    } catch (err) {
                        auditLog(`Error generating token ${err.message}`,'AUD_ACC_LOGIN', eventOrigin, 'KO').error("error");
                        return responses.generateKoResponse(err, eventOrigin);
                    }
                } else {
                    auditLog('Authorization Token not present','AUD_ACC_LOGIN', eventOrigin, 'KO').error("error");
                    return responses.generateKoResponse('AuthorizationToken not present', eventOrigin);
                }
            } else {
                auditLog('Origin not allowed','AUD_ACC_LOGIN', eventOrigin, 'KO').error("error");
                return responses.generateKoResponse('Origin not allowed', eventOrigin);
            }
        } else {
            auditLog('eventOrigin is null','AUD_ACC_LOGIN', eventOrigin, 'KO').error("error");
            return responses.generateKoResponse('eventOrigin is null', '*');
        }
        
    }
}
