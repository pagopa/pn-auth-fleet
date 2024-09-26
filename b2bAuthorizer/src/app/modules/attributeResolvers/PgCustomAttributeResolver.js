const dynamoFunctions = require("../middleware/dynamoFunctions");
const { AllowedIssuerDao, JwtAttributesDao } = require('pn-auth-common');
const axios = require("axios");
const AuthenticationError = require("../../errors/AuthenticationError");
const { ATTR_PREFIX } = require("pn-auth-common/app/modules/dao/constants");

const basePath = process.env.API_PRIVATE_BASE_PATH;
const consentType = process.env.CONSENT_TYPE;

async function PgCustomAttributeResolver( jwt, lambdaEvent, context, attrResolverCfg ) {  
  if(!contextIsAlreadySet(context)){
      context["cx_jti"] = jwt.jti + "@" + jwt.iss;
      context["sourceChannel"] = lambdaEvent?.stageVariables?.IntendedUsage;
      context["allowedApplicationRoles"] = ["DESTINATARIO-PG"];

      const uid = await retrieveVirtualKeyAndEnrichContext(context, jwt.virtual_key, jwt.iss);
      // checkPGConsent has been parallelized for performance increment
      // this brings to possibly wrong call to 
      //retrieveAllowedIssuerAndEnrichContext,retrieveUserRoleAndEnrichContext,retrieveUserGroupsAndEnrichContext
      try {
         await Promise.all([
            checkPGConsent(context),
            retrieveAllowedIssuerAndEnrichContext(context, jwt.iss),
            retrieveUserRoleAndEnrichContext(context, uid),
            retrieveUserGroupsAndEnrichContext(context, uid)
        ]);
      } catch(e)
      {
        throw e;
      }
      
      if(process.env.ENABLE_PGCUSTOM_CACHE === 'true'){
        await persistAllowedAttributesCache(context, jwt);
      }
  } else{
    try { 
      await checkPGConsent(context);
    } catch(e){
      throw new AuthenticationError("User has not given consent to use the service");
    }
  
  }

  console.log('PgCustomResolver done')
    
  return {
    context: context,
    usageIdentifierKey: null
  }
}

function contextIsAlreadySet(context){
  console.log(context, "CONTESTO");
  return context["cx_jti"]
    && context["sourceChannel"]
    && context["uid"]
    && context["cx_id"]
    && context["cx_type"]
    && context["cx_role"]
    && context["cx_groups"]
    && context["callableApiTags"]
    && context["allowedApplicationRoles"]
    && context["applicationRole"];
}

async function persistAllowedAttributesCache(context, jwt){
  const cacheDuration = process.env.PG_CUSTOM_CACHE_MAX_USAGE_EPOCH_SEC ? parseInt(process.env.PG_CUSTOM_CACHE_MAX_USAGE_EPOCH_SEC) : 0 ;

  const now = Date.now();
  const cacheMaxUsageEpochSec = Math.floor(now / 1000) + cacheDuration;
  const item = constructItem(context, jwt, now, cacheMaxUsageEpochSec);
  await JwtAttributesDao.putJwtAttributes(item);
}

function constructItem(context, jwt, now, cacheMaxUsageEpochSec){
    const item = {
        hashKey: `${ATTR_PREFIX}~${jwt.iss}~virtual_key~${jwt.virtual_key}`,
        sortKey: `NA`,
        issuer: jwt.iss,
        issuerRelatedKey: `virtual_key~${jwt.virtual_key}`,
        modificationTimeEpochMs: now,
        resolver: `PGCUSTOM`,
        cacheMaxUsageEpochSec: cacheMaxUsageEpochSec,
        ttl: cacheMaxUsageEpochSec,
        contextAttributes: {
            jti: context["cx_jti"],
            sourceChannel: context["sourceChannel"],
            uid: context["uid"],
            cx_id: context["cx_id"],
            cx_type: context["cx_type"],
            cx_role: context["cx_role"],
            cx_groups: context["cx_groups"]??[],
            callableApiTags: context["callableApiTags"],
            allowedApplicationRoles: context["allowedApplicationRoles"],
            applicationRole: context["applicationRole"]
        }
    }
    return item;
}

async function retrieveVirtualKeyAndEnrichContext(context, virtualKey, iss) {
  const apiKeyDynamo = await dynamoFunctions.getApiKeyByIndex(virtualKey);

   if (!checkStatus(apiKeyDynamo.status)) {
     throw new AuthenticationError(
       `Key is not allowed with status ${apiKeyDynamo.status}`
     );
   }

   if(apiKeyDynamo.scope != "CLIENTID"){
       throw new AuthenticationError(`virtualKey (${apiKeyDynamo.name}) SCOPE not allowed for this operation`);
   }

   if(apiKeyDynamo.cxId != iss){
       throw new AuthenticationError(`virtualKey ${apiKeyDynamo.name} is not associated to the PG ${apiKeyDynamo.cxId}`);
   }

   context["uid"] = apiKeyDynamo.uid;
   context["cx_id"] = apiKeyDynamo.cxId;
   context["cx_type"] = apiKeyDynamo.cxType;

   return apiKeyDynamo.uid;
}

async function retrieveUserRoleAndEnrichContext(context, uid) {
    //chiamata a external-registries "/ext-registry-private/pg/v1/user"
    //inserire nel context user.product.productRole
    const userRoleUrl = `${basePath}/ext-registry-private/pg/v1/user`;
    const userRoleResponse = await axios.get(userRoleUrl, {
      headers: {
        'x-pagopa-pn-uid': uid,
        'x-pagopa-pn-cx-id': context["cx_id"]
      }
    });
    let userRole = userRoleResponse.data.product.productRole.replace("pg-", "");
    context["cx_role"] = userRole;
}

async function retrieveUserGroupsAndEnrichContext(context, uid) {
    //chiamata a external-registries "/ext-registry-private/pg/v1/user-groups"
    const userGroupUrl = `${basePath}/ext-registry-private/pg/v1/user-groups`;
    const userGroupResponse = await axios.get(userGroupUrl, {
      headers: {
        'x-pagopa-pn-cx-id': context["cx_id"],
        'x-pagopa-pn-uid': uid
      },
      params: {
        statusFilter: "ACTIVE"
      }
    });

    let groups;
    if (userGroupResponse.data && userGroupResponse.data.length > 0) {
      groups = userGroupResponse.data.map(group => group["id"]);
    }
    if (groups) { 
      context["cx_groups"] = groups;
    }
}

async function retrieveAllowedIssuerAndEnrichContext(context, iss) {
   const allowedIssuer = await AllowedIssuerDao.getConfigByISS(iss);
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

  if(!consent){
    throw new AuthenticationError("User has not given consent to use the service");
  }
  if (!consent.data.accepted)
    throw new AuthenticationError("User has not given consent to use the service");

}


function checkStatus(status) {
  return status === "ENABLED" || status === "ROTATED";
}

module.exports = PgCustomAttributeResolver;