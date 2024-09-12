const { expect } = require("chai");
const fs = require('fs');
const { AllowedIssuerDao, DTO, S3Functions } = require('pn-auth-common');

const JwtIssuerUpsertCommand = require('../app/command/JwtIssuerUpsertCommand')

// Mock delle variabili di ambiente
process.env.JWKS_CONTENTS = 'test-bucket';
process.env.JWKS_B2BDEST_PREFIX = 'test-prefix';

// Mock delle funzioni senza result

S3Functions.putObject = async function (input) {
  console.log('putObject chiamato con:', input);
};

AllowedIssuerDao.upsertJwtIssuer = async function (dto) {
  console.log('upsertJwtIssuer chiamato con:', dto);
};

AllowedIssuerDao.addJwksCacheEntry = async function (iss, Fn) {
  console.log('addJwksCacheEntry chiamato con:', iss);
};

DTO.JwtIssuerUpsertDTO = {
  fromObject: function (obj) {
      return { ...obj, fromDTO: true }; // Simulazione della conversione in DTO
  }
};

describe("upsert command testing", () => {
  it("Executing with correct body", async () => {
    AllowedIssuerDao.getConfigByISS = async function (iss) {
      return JSON.parse(fs.readFileSync('src/test/resources/issuerConfig.json'))
    };
    
    const input = JSON.parse(fs.readFileSync('src/test/resources/inputUpsert.json'));
    const jwtIssuerUpsertCommand = new JwtIssuerUpsertCommand(input);      
    let error = null;
    try {
        await jwtIssuerUpsertCommand.execute()
    } catch (err) {
        error = err;
    }
    expect(error).to.be.null;
  })
  
  it("Executing with jwks url error", async () => {
    AllowedIssuerDao.getConfigByISS = async function (iss) {
      const issuerConfig = JSON.parse(fs.readFileSync('src/test/resources/issuerConfig.json'))
      issuerConfig.JWKSUrl = "https://test.it"
      return issuerConfig;
    };
    
    const input = JSON.parse(fs.readFileSync('src/test/resources/inputUpsert.json'));
    const jwtIssuerUpsertCommand = new JwtIssuerUpsertCommand(input);
    let error = null;
    try {
        await jwtIssuerUpsertCommand.execute()
    } catch (err) {
        error = err;
    }
    expect(error).to.be.not.null;
  })
});
