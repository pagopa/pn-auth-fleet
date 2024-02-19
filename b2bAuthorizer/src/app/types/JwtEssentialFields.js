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

    static fromObject(obj) {
        return new JwtEssentialFields(obj.aud, obj.iss, obj.kid, obj.purposeId, obj.client_id, obj.jti);
    }
}