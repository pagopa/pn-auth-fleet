const { expect } = require("chai");
const fs = require('fs');
const { JwtAttributesDao, AllowedIssuerDao, DTO } = require('pn-auth-common');

const JwtIssuerDeleteCommand = require('../app/command/JwtIssuerDeleteCommand')

// Mock delle variabili di ambiente
process.env.JWKS_CONTENTS = 'test-bucket';
process.env.JWKS_B2BDEST_PREFIX = 'test-prefix';

// Mock delle funzioni senza result

AllowedIssuerDao.deleteJwtIssuer = async function (dto) {
  console.log('upsertJwtIssuer chiamato con:', dto);
};

JwtAttributesDao.deleteJwtAttributesByJwtIssuer = async function (iss) {
  console.log('deleteJwtAttributesByJwtIssuer chiamato con:', iss);
};

DTO.JwtIssuerUpsertDTO = {
  fromObject: function (obj) {
      return { ...obj, fromDTO: true }; // Simulazione della conversione in DTO
  }
};

describe("delete command testing", () => {
  it("Executing with correct body", async () => {
    AllowedIssuerDao.getConfigByISS = async function (iss) {
      return { JWKSUrl: 's3://existing-url' }; 
    };
    
    const input = JSON.parse(fs.readFileSync('src/test/resources/inputDelete.json'));
    const jwtIssuerDeleteCommand = new JwtIssuerDeleteCommand(input);      
    let error = null;
    try {
        await jwtIssuerDeleteCommand.execute()
    } catch (err) {
        error = err;
    }
    expect(error).to.be.null;
  })
  
  it("Executing with issuer not found", async () => {
    AllowedIssuerDao.getConfigByISS = async function (iss) {
      return []
    };
    
    const input = JSON.parse(fs.readFileSync('src/test/resources/inputDelete.json'));
    const jwtIssuerDeleteCommand = new JwtIssuerDeleteCommand(input);
    let error = null;
    try {
        await jwtIssuerDeleteCommand.execute()
    } catch (err) {
        error = err;
    }
    expect(error).to.be.not.null;
  })

  it("Executing with jwks url error", async () => {
    AllowedIssuerDao.getConfigByISS = async function (iss) {
      const issuerConfig = JSON.parse(fs.readFileSync('src/test/resources/issuerConfig.json'))
      issuerConfig.JWKSUrl = "https://test.it"
      return issuerConfig;
    };
    const input = JSON.parse(fs.readFileSync('src/test/resources/inputDelete.json'));
    const jwtIssuerDeleteCommand = new JwtIssuerDeleteCommand(input);
    let error = null;
    try {
        await jwtIssuerDeleteCommand.execute()
    } catch (err) {
        error = err;
    }
    expect(error).to.be.not.null;
  })
});
