const dynamoFunctions = require("./dynamoFunctions.js");
const { AllowedIssuerDao } = require('pn-auth-common');
const axios = require("axios");

const basePath = ''; //definire variabile esterna
const consentType = ''; //definire variabile esterna/globale

async function PgCustomAttributeResolver( jwt, lambdaEvent, context, attrResolverCfg ) {
  context["cx_jti"] = jwt.jti + "@" + jwt.iss;
  context["sourceChannel"] = lambdaEvent?.stageVariables?.IntendedUsage;
    
  const uid = await retrieveVirtualKeyAndEnrichContext(context, jwt.iss);
  checkPGConsent(context);

  await Promise.all([
    retrieveAllowedIssuerAndEnrichContext(context, jwt.iss),
    retrieveUserRoleAndEnrichContext(context, jwt.iss, uid),
    retrieveUserGroupsAndEnrichContext(context, jwt.iss, uid)
  ]);
    
  return {
    context: context,
    usageIdentifierKey: null
  }
}

async function retrieveVirtualKeyAndEnrichContext(context, iss) {
  const apiKeyDynamo = await dynamoFunctions.getApiKeyByIndex(virtualKey);

   if (!checkStatus(apiKeyDynamo.status)) {
     throw new AuthenticationError(
       `Key is not allowed with status ${apiKeyDynamo.status}`
     );
   }

   if(apiKeyDynamo.scope != "CLIENTID"){
       throw new AuthenticationError("virtualKey Scope not allowed for this operation");
   }

   if(apiKeyDynamo.cxId != jwt.iss){
       throw new AuthenticationError("virtualKey is not associated to the PG");
   }

   context["uid"] = apiKeyDynamo.uid;
   context["cx_id"] = apiKeyDynamo.cxId;
   context["cx_type"] = apiKeyDynamo.cxType;

   return apiKeyDynamo.uid;
}

async function retrieveUserRoleAndEnrichContext(context, iss, uid) {
    //chiamata a external-registries "/ext-registry-private/pg/v1/user"
    //inserire nel context user.product.productRole
    context["cx_role"] = "";
}

async function retrieveUserGroupsAndEnrichContext(context, iss, uid) {
    //chiamata a external-registries "/ext-registry-private/pg/v1/user-groups"
    //inserire nel context la lista di groupId
    context["cx_groups"] = "";
}

async function retrieveAllowedIssuerAndEnrichContext(context, iss) {
   const allowedIssuer = await AllowedIssuerDao.getConfigByISS(jwt.iss);
    if (!allowedIssuer) {
      throw new AuthenticationError("Issuer not allowed");
    }
    const attributeResolversCfg = allowedIssuer.attributeResolversCfgs.find(attributeResolversCfg => attributeResolversCfg.name === "PGCUSTOM");
    context["callableApiTags"] = attributeResolversCfg.cfg.purposes;
}

async function checkPGConsent(context){
  ///ext-registry-private/privacynotice/{consentsType}/{portalType}:
  const versionUrl = `${basePath}/ext-registry-private/privacynotice/${consentType}/PG`;
  const versionResponse = await axios.get(versionUrl);

  const version = versionResponse.data.version; 

  //chiamata a user-attributes verso API: /pg-consents/v1/consents/{consentType}
  const consentsUrl = `${basePath}/pg-consents/v1/consents/${consentType}`;
  const consent = await axios.get(consentsUrl, {
    headers: {
      'x-pagopa-pn-cx-id': context["cx_id"],
      'x-pagopa-pn-cx-type': context["cx_type"]
    },
    params: {
      version: version
    }
  });

  if(!consent || consent.data.accepted !== true){
     throw new AuthenticationError("User has not given consent to use the service");
  }
}


function checkStatus(status) {
  return status === "ENABLED" || status === "ROTATED";
}

module.exports = PgCustomAttributeResolver;