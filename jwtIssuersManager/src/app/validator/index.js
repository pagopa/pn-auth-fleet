/*

{
"actionType" : "UPSERT"
"iss": "", //issuer generato al punto 3
 "attributeResolversCfgs": [
  {
   "cfg": {
    "keyAttributeName": "virtual_key"
   },
   "name": "DATABASE" //definito se è possibile implementare la cache del context
  },
  {
   "cfg": {
    "purposes": ["REFINEMENT","BASE","MANDATE"]
   },
   "name": "PGCUSTOM"
  }
 ],
 "JWKSCacheMaxDurationSec": 172800,
 "JWKSCacheRenewSec": 300,
 "JWKSBody": //body '', 
}

{
"actionType" : "DELETE",
"iss": ""
}
*/

function validateBody(body){

    const errors = []
    const {actionType, iss, attributeResolversCfgs, JWKSCacheMaxDurationSec, JWKSCacheRenewSec, JWKSBody} = body;

    if(!actionType){
        errors.push(['actionType is required']);
    }

    if(!iss){
        errors.push(['iss is required']);
    }

    const actionTypeAllowedValues = [UPSERT_ACTION_TYPE, DELETE_ACTION_TYPE];
    if(!actionTypeAllowedValues.includes(actionType)){
        errors.push(['actionType must be one of '+actionTypeAllowedValues.join(',')]);
    }

    if(errors.length>0){
        return errors;
    }

    if(actionType === 'UPSERT'){
        if(!attributeResolversCfgs){
            errors.push(['attributeResolversCfgs is required']);
        }

        if(!JWKSCacheMaxDurationSec){
            errors.push(['JWKSCacheMaxDurationSec is required']);
        }

        if(!JWKSCacheRenewSec){
            errors.push(['JWKSCacheRenewSec is required']);
        }

        if(!JWKSBody){
            errors.push(['JWKSBody is required']);
        }
    }

    return errors;
}

module.exports = {
    validateBody
}