const DefaultAttributeResolver = require('./DefaultAttributeResolver');

class AttributeResolversMap {

    #attributeResolversMapping = new Map()

    constructor() {
        this.#attributeResolversMapping = new Map(Object.entries(this.#readAttributeResolversMapping()));
    }

    #readAttributeResolversMapping(){
        return require('../../config/attributeResolversCfg.json')
    }

    #getAttributeResolver(name) {
        const cfg = this.#attributeResolversMapping.get(name);
        if(!cfg){
            throw new Error("Attribute resolver with name "+name+" not found")
        }
        const attributeResolver = require(`./${cfg.fileName}.js`);
        return attributeResolver
    }

    #isNotBlank(str) {
        return str !== null && str !== undefined && str !== ''
    }
//    simpleJwt, event, issuerInfo.cfg.attributeResolversCfgs
    async resolveAttributes(jwt, lambdaEvent, attributeResolversCfgs = []) {
        let { context, usageIdentifierKey } = DefaultAttributeResolver(jwt, lambdaEvent, {}, {})
        const initialApplicationRole = context.applicationRole;
        
        for( let i=0; i< attributeResolversCfgs.length; i++ ) {
            const attributeResolverCfg = attributeResolversCfgs[i];
            const attributeResolver = this.#getAttributeResolver( attributeResolverCfg.name );
            const singleResolution = await attributeResolver(jwt, lambdaEvent, context, attributeResolverCfg.cfg );
            if ( 
                this.#isNotBlank( usageIdentifierKey ) 
              && 
                this.#isNotBlank( singleResolution.usageIdentifierKey ) 
            ) {
              throw new Error("usageIdentifierKey conflict")
            }
            context = singleResolution.context;
            usageIdentifierKey = singleResolution.usageIdentifierKey;
        }
        context.applicationRole = initialApplicationRole;
        return { context, usageIdentifierKey }
    }
}

module.exports = AttributeResolversMap;