const { DELETE_ACTION_TYPE, UPSERT_ACTION_TYPE } = require('../config/constants');

function validateBody(body){

    const errors = []
    const actionTypeAllowedValues = [UPSERT_ACTION_TYPE, DELETE_ACTION_TYPE];
    const {actionType, iss, attributeResolversCfgs, JWKSCacheMaxDurationSec, JWKSCacheRenewSec, JWKSBody} = body;

    if(!actionType){
        errors.push(['actionType is required']);
    }

    if(!iss){
        errors.push(['iss is required']);
    }
    
    if(errors.length>0){
        return errors;
    }

    if(!actionTypeAllowedValues.includes(actionType)){
        errors.push(['actionType must be one of '+actionTypeAllowedValues.join(', ')]);
    }

    if(actionType === 'UPSERT'){
        /*if(!attributeResolversCfgs){
            errors.push(['attributeResolversCfgs is required']);
        }

        if(!JWKSCacheMaxDurationSec){
            errors.push(['JWKSCacheMaxDurationSec is required']);
        }

        if(!JWKSCacheRenewSec){
            errors.push(['JWKSCacheRenewSec is required']);
        }*/
        if(!JWKSBody){
            errors.push(['JWKSBody is required']);
        }
    }

    return errors;
}

module.exports = {
    validateBody
}