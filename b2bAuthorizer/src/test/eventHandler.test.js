const { expect } = require("chai");
const rewire = require("rewire");
const JWT_MAX_AGE_SECONDS_1_YEAR = 31536000;
const JWT_CLOCK_TOLERANCE_SECONDS = 60;
process.env.JWT_MAX_AGE_SECONDS = JWT_MAX_AGE_SECONDS_1_YEAR;
process.env.JWT_CLOCK_TOLERANCE_SECONDS = JWT_CLOCK_TOLERANCE_SECONDS;

const EventHandler = rewire("../app/eventHandler");
const fs = require('fs');
const AuthenticationError = require("../app/errors/AuthenticationError");

const jwtWithoutIss = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2lkIn0.eyJhdWQiOiJodHRwczovL3Rlc3QtaXNzdWVyLmRldi5ub3RpZmljaGVkaWdpdGFsaS5pdCIsImp0aSI6IjEyMzEyMzEyMzEyMzEyIiwiaWF0IjoxNzA3OTkxMDcyfQ.XPd60_xhB8VVunyZMm-CSM4avUtUlQSgOE3DMjDtpvCzV5zHd7XUNX_zzoJ0LWZpQIQ5-aigI40pNNqfNvvrty7dv06DUrt0wFUsVY_j2Uyg3wP0P-1eKAjNlJzh1a3Q-K9gx0upRTCnO8_tCxWS5XrP0wXpA36zAq0y30hs9OvDc97FdyheXb6phsOGBoWsenMHXlUcPjK_92JD7lVP-JO-G_bJNtN3V51HRdtuSjUSCEd_blXprUMDQCLDd6MhoHnZezgaxZgvFx06xwMlSm0YJiZp26BMBGgDPbe1brfLgMqFn6-AVWLIYm1YHdQ2nYWBt0Usiuz74K3mD8fDecRcc0th9hE2KiJ0B0kX0Rek16PjY1FgWBY1SAwAKBcansdMzzHLue7bLxdjmsoxQVCgbcrH6ytQWsKPxrHglbiqtGt9YbXzll7KtvRqi7jX0TuZchKApDCnjq0AzUVzVY__PmeP0hTCutaZHBynkPVDgDroUwGuzkGCm6Oda4GVf2JPd51CvD9cLPgjZLzF_HXDs2Hdjhk4Xzrc5KCCMXFN8n76UJ1R_nDFx-j5X3iMaotf6khi-B1ygiTEhR8pFLzOthfGleYZLi7geFX4S9OBMSyYjQCQEXU0lN02e5YtOKSfBNP1uT1bzFtF5LB7o1p7fDDZpjmTf2Ue7HoC--Q';

// dev notes: if you need to refresh JWT token, you can use the following code with the key stored in secret of Dev Core "test/pn-auth-fleet-unit-test-radd-jwt-key":
// https://github.com/pagopa/pn-troubleshooting/blob/main/jwt-auth/generate-jwt.js
const jwt1yearValid = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2lkIn0.eyJhdWQiOiJodHRwczovL2FwaS5yYWRkLmRldi5ub3RpZmljaGVkaWdpdGFsaS5pdCIsImlzcyI6InRlc3QtaXNzdWVyLmRldi5ub3RpZmljaGVkaWdpdGFsaS5pdCIsImp0aSI6IjEyMzEyMzEyMzEyMzEyNTUiLCJpYXQiOjE3MTAxNTE3ODUsImV4cCI6MTc0MTcwOTM4NX0.DYs7wKmfL-xchc40W8ptr2ySDRhh5ZbKknGoJO96qYfjt3Pdp3RA-Sr4wHM8UbY3FjyLtMQgGccdvgOd20GFJrM0jOaRLiPAoMXSIiCYdVkOh0VHEnuFNVXbRdLFSUcGbxddr12bIo4MncJx0UuIF3gMze5fW6urNaBTmKLIK-uvhB5EmGENrjoChHdiHaScRk3-ufk5PIvQHK2l6Kvfjsa0SruZX13kOA9IlIdH9DxZ7LT10-wkffYS72ClhCVyiqkFBxy6J8gdzugi3L6gIPSN9MAJSmsYHENC6i2I7XjfqhO1iglNzqloV4ElGMTuKiqxe-koM_pOkM8UQ55yFAGWSmFWdFSwDc7pukdaXuXwcR4Rg6zFvyFHrwlO7IA_TRt77EYHmpen5LoFH2GCT4p-jUCG5GmDyIuplZMzRD3WCzk4geuOoUKeW75AN0_F5O2L7Iem-LYz4pqYaNzwu8uLYcrmZSKNSGzaiNvSlFDdLQpVwFu9k6GR0RU6Ll6iC7BLs85fXzaaSnP6Av0bnp1DOnW4FGxBl8WCSoV2vbLiICEOAJVm39BcsI1q2PQ8-3CwkYPuPKW2BFM_Bn_9g5wrajMhliV1oayPnnn2kn1qRRvaUb2CAlfumEBsHg0C0o0biDF_zo4eTX_g6KTuKFLPi-lzy6pLfQPq8rBBbro' // expires on March 11th 2025

describe("test eventHandler", () => {

  after(() => {
    delete process.env.JWT_MAX_AGE_SECONDS;
    delete process.env.JWT_CLOCK_TOLERANCE_SECONDS;
  });

  it("should return an exception if jwt token is missing", async () => {
    const event = {
      headers: {

      }
    };
    try {
      await EventHandler.handleEvent(event);
      expect().fail('Expected an exception')
    } catch(e) {
      expect(e.message).to.be.equal("JWT Token not found in Authorization header");
    }
  })

  it("should return an exception if issuer is not found", async () => {
    const event = {
      headers:{
        authorization: 'Bearer ' + jwtWithoutIss,
      } 
    };

    try {
      await EventHandler.handleEvent(event);
      expect().fail('Expected an exception')
    } catch(e) {
      expect(e.message).to.be.equal("Issuer not found in JWT");
    }
  })

  it("should return an allow policy", async () => {
    const event = {
      stageVariables: {
        IntendedUsage: 'RADD'
      },
      headers: {
        "X-Amzn-Trace-Id": "Root=1-5f8d0f9e-5d0b7f8c7f0d6d4b0c0a0b0c",
        Authorization: 'Bearer ' + jwt1yearValid
      },
      requestContext: {
        domainName: "api.radd.dev.notifichedigitali.it"
      }
    };



    // mock issuersCache
    const jwks = fs.readFileSync('./src/test/resources/jwks.json');
    const jwksAsBuffer = Buffer.from(jwks, 'utf8');
    const issuersCache = {
      getOrLoad: async (issuerId) => {
        return {
          cfg: {
            iss: issuerId,
            attributeResolversCfgs: [

            ]
          },
          jwksCache: [ { JWKSBody: jwksAsBuffer } ]
        }
      }
    }
    EventHandler.__set__("issuersCache", issuersCache);


    // mock attributeResolvers
    const attributeResolvers = {
      resolveAttributes: async (simpleJwt, lambdaEvent, issuerInfo) => {
        return {
          context: {
            sourceChannel: "RADD",
            cx_jti: simpleJwt.kid,
            applicationRole: "user",
            allowedApplicationRoles: ["user"]
          },
          usageIdentifierKey: null
        }
      }
    }
    EventHandler.__set__("attributeResolvers", attributeResolvers);

    const result = await EventHandler.handleEvent(event);
    
    expect(result).to.deep.equal({
      principalId: "user-1231231231231255",
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "execute-api:Invoke",
            Effect: "Allow",
            Resource: "*"
          }
        ]
      },
      context: {
        sourceChannel: "RADD",
        cx_jti: 'test-kid',
        applicationRole: "user",
        allowedApplicationRoles: "[\"user\"]"
      },
      usageIdentifierKey: null
    })

  })

  it("should return an allow policy with cache refresh", async () => {
    const event = {
      stageVariables: {
        IntendedUsage: 'RADD'
      },
      headers: {
        "X-Amzn-Trace-Id": "Root=1-5f8d0f9e-5d0b7f8c7f0d6d4b0c0a0b0c",
        Authorization: 'Bearer ' + jwt1yearValid
      },
      requestContext: {
        domainName: "api.radd.dev.notifichedigitali.it"
      }
    };

    // mock issuersCache
    const jwks = fs.readFileSync('./src/test/resources/jwks.json');
    const jwksAsBuffer = Buffer.from(jwks, 'utf8');
    const issuersCache = {
      getOrLoad: async (issuerId) => {
        return {
          cfg: {
            iss: issuerId,
            attributeResolversCfgs: [

            ]
          },
          jwksCache: [ ] // no jwks to make it fail at first
        }
      },
      getWithForceRefresh: async (issuerId) => {
        return {
          cfg: {
            iss: issuerId,
            attributeResolversCfgs: [

            ]
          },
          jwksCache: [ { JWKSBody: jwksAsBuffer } ]
        }
      }
    }
    EventHandler.__set__("issuersCache", issuersCache);

    // mock attributeResolvers
    const attributeResolvers = {
      resolveAttributes: async (simpleJwt, lambdaEvent, issuerInfo) => {
        return {
          context: {
            sourceChannel: "RADD",
            cx_jti: simpleJwt.kid,
            applicationRole: "user",
            allowedApplicationRoles: ["user"]
          },
          usageIdentifierKey: null
        }
      }
    }
    EventHandler.__set__("attributeResolvers", attributeResolvers);

    const result = await EventHandler.handleEvent(event);
    
    expect(result).to.deep.equal({
      principalId: "user-1231231231231255",
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "execute-api:Invoke",
            Effect: "Allow",
            Resource: "*"
          }
        ]
      },
      context: {
        sourceChannel: "RADD",
        cx_jti: 'test-kid',
        applicationRole: "user",
        allowedApplicationRoles: "[\"user\"]"
      },
      usageIdentifierKey: null
    })

  })

  it("should return an a generic error during jwt validation", async () => {
    const event = {
      stageVariables: {
        IntendedUsage: 'RADD'
      },
      headers: {
        "X-Amzn-Trace-Id": "Root=1-5f8d0f9e-5d0b7f8c7f0d6d4b0c0a0b0c",
        Authorization: 'Bearer ' + jwt1yearValid
      },
      requestContext: {
        domainName: "api.radd.dev.notifichedigitali.it"
      }
    };

    // mock jwtService
    const jwtService = {
      decodeToken: (jwt) => {
        return {
          header: {
            kid: 'test-kid'
          },
          payload: {
            iss: 'test-issuer',
            aud: 'https://api.radd.dev.notifichedigitali.it'
          }
        }
      },
      validateToken: (issuerInfo, decodedJwtToken, jwt, lambdaEvent) => {
        throw new Error('Error validating token');
      },
      extractEssentialFields: (decodedJwtToken) => {
        return {
          kid: 'test-kid'
        }
      }
    }

    EventHandler.__set__("jwtService", jwtService);

    // mock issuersCache
    const jwks = fs.readFileSync('./src/test/resources/jwks.json');
    const jwksAsBuffer = Buffer.from(jwks, 'utf8');
    const issuersCache = {
      getOrLoad: async (issuerId) => {
        return {
          cfg: {
            iss: issuerId,
            attributeResolversCfgs: [

            ]
          },
          jwksCache: [ ] // no jwks to make it fail at first
        }
      },
      getWithForceRefresh: async (issuerId) => {
        return {
          cfg: {
            iss: issuerId,
            attributeResolversCfgs: [

            ]
          },
          jwksCache: [ { JWKSBody: jwksAsBuffer } ]
        }
      }
    }
    EventHandler.__set__("issuersCache", issuersCache);

    try {
      await EventHandler.handleEvent(event); 
      expect().fail('Expected an exception')
    } catch(e){
      expect(e.message).to.be.equal('Error validating token');
    }
    
    

  })

  it("should return an a autentication error during jwt validation", async () => {
    const event = {
      stageVariables: {
        IntendedUsage: 'RADD'
      },
      headers: {
        "X-Amzn-Trace-Id": "Root=1-5f8d0f9e-5d0b7f8c7f0d6d4b0c0a0b0c",
        Authorization: 'Bearer ' + jwt1yearValid
      },
      requestContext: {
        domainName: "api.radd.dev.notifichedigitali.it"
      }
    };

    // mock jwtService
    const jwtService = {
      decodeToken: (jwt) => {
        return {
          header: {
            kid: 'test-kid'
          },
          payload: {
            iss: 'test-issuer',
            aud: 'https://api.radd.dev.notifichedigitali.it'
          }
        }
      },
      validateToken: (issuerInfo, decodedJwtToken, jwt, lambdaEvent) => {
        throw new AuthenticationError('Error validating token', {
          validKeys: []
        });
      },
      extractEssentialFields: (decodedJwtToken) => {
        return {
          kid: 'test-kid'
        }
      }
    }

    EventHandler.__set__("jwtService", jwtService);

    // mock issuersCache
    const jwks = fs.readFileSync('./src/test/resources/jwks.json');
    const jwksAsBuffer = Buffer.from(jwks, 'utf8');
    const issuersCache = {
      getOrLoad: async (issuerId) => {
        return {
          cfg: {
            iss: issuerId,
            attributeResolversCfgs: [

            ]
          },
          jwksCache: [ ] // no jwks to make it fail at first
        }
      },
      getWithForceRefresh: async (issuerId) => {
        return {
          cfg: {
            iss: issuerId,
            attributeResolversCfgs: [

            ]
          },
          jwksCache: [ { JWKSBody: jwksAsBuffer } ]
        }
      }
    }
    EventHandler.__set__("issuersCache", issuersCache);

    const ret = await EventHandler.handleEvent(event); 
    expect(ret).to.deep.equal({
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "execute-api:Invoke",
            Effect: "Deny",
            Resource: "*"
          }
        ]
      },
      context: {
      },
      usageIdentifierKey: null
    })
    
  })
});
