const { UrlDownloader, AllowedIssuerDao, DTO } = require('pn-auth-common')

class JwtIssuerUpsertCommand {
  
    #jwtIssuerUpsertCommandInput;

    constructor(jwtIssuerUpsertCommandInput) {
        this.#jwtIssuerUpsertCommandInput = jwtIssuerUpsertCommandInput;
    }

    async execute() {
        const issuer = await AllowedIssuerDao.getConfigByISS(this.#jwtIssuerUpsertCommandInput.iss);

        if(issuer && issuer.JWKSUrl.indexOf('s3://')<0){
            throw new Error("Unsupported issuer with public JWKS url");
        }

        const jwtIssuerUpsertDTO = DTO.JwtIssuerUpsertDTO.fromObject(this.#jwtIssuerUpsertCommandInput);

        if(issuer && this.#jwtIssuerUpsertCommandInput.attributeResolversCfgs && this.#jwtIssuerUpsertCommandInput.attributeResolversCfgs.name!==issuer.attributeResolversCfgs.name){
            throw new Error("Cannot change attributeResolversCfgs");
        }

        // TODO: upload jwks to S3

        // delete jwksBody
        // set jwksUrl to s3://...
        
        await AllowedIssuerDao.upsertJwtIssuer(jwtIssuerUpsertDTO);
        await AllowedIssuerDao.addJwksCacheEntry(jwtIssuerUpsertDTO.iss, UrlDownloader.downloadUrl);
    }
    
}

module.exports = JwtIssuerUpsertCommand;