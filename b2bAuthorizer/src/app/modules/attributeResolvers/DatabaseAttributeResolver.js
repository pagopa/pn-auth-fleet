

async function DatabaseAttributeResolver( jwt, lambdaEvent, context, attrResolverCfg ) {
    return {
        context: {},
        usageIdentifierKey: null
    }
}

module.exports = DatabaseAttributeResolver;