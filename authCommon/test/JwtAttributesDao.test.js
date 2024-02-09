const { ATTR_PREFIX } = require('./constants');
const JwtAttributesDao = rewire("../app/modules/dao/JwtAttributesDao");

describe('AllowedIssuerDAO Testing', () => {
 
    it('buildHashKeyForAttributeResolver', () => {
        const buildHashKeyForAttributeResolver = JwtAttributesDao.__get__('buildHashKeyForAttributeResolver');
        const jwt = fs.readFileSync('test/resources/jwt.json')
        attrResolverCfg = {
            "keyAttributeName": "kid"
            }
        const result = buildHashKeyForAttributeResolver(jwt, attrResolverCfg);
        expect(result).to.equal(ATTR_PREFIX + "~" + jwt.iss + "~" + attrResolverCfg.keyAttributeName + "~" + jwtEssentalFields[ attrResolverCfg.keyAttributeName ]);
    });
});
