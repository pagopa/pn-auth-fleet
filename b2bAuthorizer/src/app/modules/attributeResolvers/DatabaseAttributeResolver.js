const { JwtAttributesDao } = require('pn-auth-common')

async function DatabaseAttributeResolver( jwt, lambdaEvent, context, attrResolverCfg ) {
    const jwtAttribute = await JwtAttributesDao.listJwtAttributes(jwt, attrResolverCfg)
    if ( jwtAttribute ) {
        for ( k in jwtAttribute.contextAttributes ) {
            console.log(k)
            context[k] = jwtAttribute.contextAttributes[k]
        }
    }
    context["cx_jti"] = jwt.kid;

    return {
        context: context,
        usageIdentifierKey: null
    }
}


module.exports = DatabaseAttributeResolver;