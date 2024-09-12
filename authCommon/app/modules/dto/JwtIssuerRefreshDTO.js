class JwtIssuerRefreshDTO {

    #iss;
    #jwksCacheOriginalExpireEpochSeconds;
  

    constructor(iss, jwksCacheOriginalExpireEpochSeconds) {
        this.#iss = iss;
        this.#jwksCacheOriginalExpireEpochSeconds = jwksCacheOriginalExpireEpochSeconds;
    }

    get iss() {
        return this.#iss;
    }

    get jwksCacheOriginalExpireEpochSeconds() {
        return this.#jwksCacheOriginalExpireEpochSeconds;
    }

    
    static fromObject(obj) {
        return new JwtIssuerRefreshDTO(obj.iss, obj.jwksCacheOriginalExpireEpochSeconds);
    }
}