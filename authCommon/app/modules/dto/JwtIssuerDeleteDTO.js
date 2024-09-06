class JwtIssuerDeleteDTO {

    // add the following private properties: iss
    #iss;

    // add the following constructor:
    constructor(iss) {
        this.#iss = iss;
    }

    get iss() {
        return this.#iss;
    }

    static fromObject(obj) {
        return new JwtIssuerDeleteDTO(obj.iss);
    }
    
}

module.exports = JwtIssuerDeleteDTO;