const { JwtAttributesDao } = require('pn-auth-common')

async function DatabaseAttributeResolver( jwt, lambdaEvent, context, attrResolverCfg ) {
    const jwtAttributes = await JwtAttributesDao.listJwtAuthAttributes(jwt, attrResolverCfg)
    for ( const jwtAttr of jwtAttributes ) {
        for ( const k in jwtAttr.contextAttributes ) {
            context[k] = jwtAttr.contextAttributes[k]
        }
    }
    context["cx_jti"] = jwt.kid;

    return {
        context: context,
        usageIdentifierKey: null
    }
}


module.exports = DatabaseResolveFunction;