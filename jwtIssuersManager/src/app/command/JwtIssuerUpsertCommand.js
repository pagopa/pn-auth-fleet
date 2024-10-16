const { UrlDownloader, AllowedIssuerDao, DTO, S3Functions } = require('pn-auth-common');

class JwtIssuerUpsertCommand {
  
    #jwtIssuerUpsertCommandInput;

    constructor(jwtIssuerUpsertCommandInput) {
        this.#jwtIssuerUpsertCommandInput = jwtIssuerUpsertCommandInput;
    }

    prepareKeyInput(input) {
        return `${Buffer.from(input).toString('base64')}.json`
    }

    async #validateInput() {
        const issuer = await AllowedIssuerDao.getConfigByISS(this.#jwtIssuerUpsertCommandInput.iss);
        if(issuer && issuer.JWKSUrl.indexOf('s3://')<0){
            throw new Error("Unsupported issuer with public JWKS url");
        }
    }
    
    async #uploadJwksToS3() {
        const fileName = this.prepareKeyInput(this.#jwtIssuerUpsertCommandInput.iss)
        const bucketName = process.env.JWKS_CONTENTS;
        const prefix = process.env.JWKS_B2BDEST_PREFIX;
        const key = `${prefix}/${fileName}`;
        const input = { // PutObjectRequest
            Bucket: bucketName,
            Key: key,
            Body: this.#jwtIssuerUpsertCommandInput.JWKSBody
        }

        await S3Functions.putObject(input);
       
        const s3FileUrl = `s3://${bucketName}/${key}`;

        return s3FileUrl;
    }

    async execute() {
        await this.#validateInput();
        
        const s3FileUrl = await this.#uploadJwksToS3();
        
        const jwtIssuerUpsertDTO = DTO.JwtIssuerUpsertDTO.fromObject(this.#jwtIssuerUpsertCommandInput);
        delete jwtIssuerUpsertDTO.JWKSBody;
        jwtIssuerUpsertDTO.JWKSUrl = s3FileUrl;
        
        await AllowedIssuerDao.upsertJwtIssuer(jwtIssuerUpsertDTO);
        await AllowedIssuerDao.addJwksCacheEntry(jwtIssuerUpsertDTO.iss, UrlDownloader.downloadUrl);
    }
    
}

module.exports = JwtIssuerUpsertCommand;