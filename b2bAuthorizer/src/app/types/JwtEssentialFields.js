class JwtEssentialFields {

    #aud;
    #iss;
    #kid;
    #purposeId;
    #client_id;
    #jti;

    constructor(aud, iss, kid, purposeId, client_id, jti) {
        this.#aud = aud;
        this.#iss = iss;
        this.#kid = kid;
        this.#purposeId = purposeId;
        this.#client_id = client_id;
        this.#jti = jti;
    }

    get aud() {
        return this.#aud;
    }

    get iss() {
        return this.#iss;
    }

    get kid() {
        return this.#kid;
    }

    get purposeId() {
        return this.#purposeId;
    }

    get client_id() {
        return this.#client_id;
    }

    get jti() {
        return this.#jti;
    }

    asObject() {
        return {
            aud: this.#aud,
            iss: this.#iss,
            kid: this.#kid,
            purposeId: this.#purposeId,
            client_id: this.#client_id,
            jti: this.#jti
        }
    }
    
    static fromJWT(jwt) {
        let kid = jwt.header.kid
        if(!kid){
            kid = jwt.payload.kid
        }

        return new JwtEssentialFields(jwt.payload.aud, jwt.payload.iss, kid, jwt.payload.purposeId, jwt.payload.client_id, jwt.payload.jti);
    }
}

module.exports = JwtEssentialFields;