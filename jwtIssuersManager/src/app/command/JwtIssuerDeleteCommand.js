const { AllowedIssuerDao, JwtAttributesDao, DTO } = require('pn-auth-common');

class JwtIssuerDeleteCommand {

    #jwtIssuerDeleteCommandInput;

    constructor(jwtIssuerDeleteCommandInput) {
        this.jwtIssuerDeleteCommandInput = jwtIssuerDeleteCommandInput;
    }

    async execute() {
        const issuer = await AllowedIssuerDao.getConfigByISS(this.#jwtIssuerDeleteCommandInput.iss);
        
        if(!issuer){
            throw new Error('Issuer not found '+iss);
        }

        const jwtIssuerDeleteDTO = DTO.JwtIssuerDeleteDTO.fromObject(this.#jwtIssuerDeleteCommandInput);
        await AllowedIssuerDao.deleteJwtIssuer(jwtIssuerDeleteDTO);
        await JwtAttributesDao.deleteJwtAttributesByJwtIssuer(issuer);
    }
}

module.exports = JwtIssuerDeleteCommand;