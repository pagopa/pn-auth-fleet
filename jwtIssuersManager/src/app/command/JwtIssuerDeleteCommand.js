const { AllowedIssuerDao, JwtAttributesDao, DTO } = require('pn-auth-common');

class JwtIssuerDeleteCommand {

    #jwtIssuerDeleteCommandInput;

    constructor(jwtIssuerDeleteCommandInput) {
        this.#jwtIssuerDeleteCommandInput = jwtIssuerDeleteCommandInput;
    }

    async execute() {
        const issuer = await AllowedIssuerDao.getConfigByISS(this.#jwtIssuerDeleteCommandInput.iss);
        
        if(!issuer && issuer.length == 0){
            throw new Error('Issuer not found '+ this.#jwtIssuerDeleteCommandInput.iss);
        }

        if(issuer.JWKSUrl.indexOf('s3://')<0){
            throw new Error("Unsupported issuer with public JWKS url");
        }
        
        const jwtIssuerDeleteDTO = DTO.JwtIssuerDeleteDTO.fromObject(this.#jwtIssuerDeleteCommandInput);
        await AllowedIssuerDao.deleteJwtIssuer(jwtIssuerDeleteDTO);
        await JwtAttributesDao.deleteJwtAttributesByJwtIssuer(issuer);
    }
}

module.exports = JwtIssuerDeleteCommand;