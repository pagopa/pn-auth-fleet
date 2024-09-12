class JwtIssuerUpsertDTO {

    #iss;
    #attributeResolversCfgs;
    #JWKSCacheMaxDurationSec;
    #JWKSCacheRenewSec;
    #JWKSBody;
    #JWKSUrl;

    constructor(iss, attributeResolversCfgs, JWKSCacheMaxDurationSec, JWKSCacheRenewSec, JWKSBody, JWKSUrl) {
        this.#iss = iss;
        this.#attributeResolversCfgs = attributeResolversCfgs;
        this.#JWKSCacheMaxDurationSec = JWKSCacheMaxDurationSec;
        this.#JWKSCacheRenewSec = JWKSCacheRenewSec;
        this.#JWKSBody = JWKSBody;
        this.#JWKSUrl = JWKSUrl;
    }

    get iss() {
        return this.#iss;
    }

    get attributeResolversCfgs() {
        return this.#attributeResolversCfgs;
    }

    get JWKSCacheMaxDurationSec() {
        return this.#JWKSCacheMaxDurationSec;
    }

    get JWKSCacheRenewSec() {
        return this.#JWKSCacheRenewSec;
    }

    get JWKSBody() {
        return this.#JWKSBody;
    }

    get JWKSUrl() {
        return this.#JWKSUrl;
    }

    static fromObject(obj) {
        return new JwtIssuerUpsertDTO(obj.iss, obj.attributeResolversCfgs, obj.JWKSCacheMaxDurationSec, obj.JWKSCacheRenewSec, obj.JWKSBody, obj.JWKSUrl);
    }
}