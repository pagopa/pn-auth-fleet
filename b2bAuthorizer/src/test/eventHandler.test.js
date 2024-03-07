const { expect } = require("chai");
const rewire = require("rewire");
const EventHandler = rewire("../app/eventHandler");
const fs = require('fs');
const AuthenticationError = require("../app/errors/AuthenticationError");

const jwtWithoutIss = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2lkIn0.eyJhdWQiOiJodHRwczovL3Rlc3QtaXNzdWVyLmRldi5ub3RpZmljaGVkaWdpdGFsaS5pdCIsImp0aSI6IjEyMzEyMzEyMzEyMzEyIiwiaWF0IjoxNzA3OTkxMDcyfQ.XPd60_xhB8VVunyZMm-CSM4avUtUlQSgOE3DMjDtpvCzV5zHd7XUNX_zzoJ0LWZpQIQ5-aigI40pNNqfNvvrty7dv06DUrt0wFUsVY_j2Uyg3wP0P-1eKAjNlJzh1a3Q-K9gx0upRTCnO8_tCxWS5XrP0wXpA36zAq0y30hs9OvDc97FdyheXb6phsOGBoWsenMHXlUcPjK_92JD7lVP-JO-G_bJNtN3V51HRdtuSjUSCEd_blXprUMDQCLDd6MhoHnZezgaxZgvFx06xwMlSm0YJiZp26BMBGgDPbe1brfLgMqFn6-AVWLIYm1YHdQ2nYWBt0Usiuz74K3mD8fDecRcc0th9hE2KiJ0B0kX0Rek16PjY1FgWBY1SAwAKBcansdMzzHLue7bLxdjmsoxQVCgbcrH6ytQWsKPxrHglbiqtGt9YbXzll7KtvRqi7jX0TuZchKApDCnjq0AzUVzVY__PmeP0hTCutaZHBynkPVDgDroUwGuzkGCm6Oda4GVf2JPd51CvD9cLPgjZLzF_HXDs2Hdjhk4Xzrc5KCCMXFN8n76UJ1R_nDFx-j5X3iMaotf6khi-B1ygiTEhR8pFLzOthfGleYZLi7geFX4S9OBMSyYjQCQEXU0lN02e5YtOKSfBNP1uT1bzFtF5LB7o1p7fDDZpjmTf2Ue7HoC--Q';
const validJWT = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2lkIn0.eyJhdWQiOiJodHRwczovL2FwaS5yYWRkLmRldi5ub3RpZmljaGVkaWdpdGFsaS5pdCIsImlzcyI6Imh0dHBzOi8vdGVzdC1pc3N1ZXIuZGV2Lm5vdGlmaWNoZWRpZ2l0YWxpLml0IiwianRpIjoiMTIzMTIzMTIzMTIzMTIiLCJpYXQiOjE3MDc5OTU1NDF9.TsOr145Jsl1nFiTF8NmPJK4I1RtkG_wi9IfOqH7D0zVgDvzQuUNwaExsIB-hF3V1PE4AxD8yUdTtVgizP9vD2aMeJnSfNcoSWje4oQnzco3bDYRrMwFuH_0BB7Moo9JzJ1XXT9TAWcpCAGamPSFA_5El1ARbcmnqrC2Ihhm0ic3fE5vD4mdqOW-Rmbt41f4Pbn7VDK7AE-y0rWywYhjdrosC1QLy1Z3HAImSr-_kPehYERJUz3yaoVUrREIe1X7xl4jOWib2H9W7Kt7IHktvn8h9j6W7XawSvaGI1R2ka8SersFQfVgOV8smneF8IxKGvI4giMx5Bo2YDnl2xTtAQc4_8lqYE3aMfBz3gBngT1ugRdkobwOVK5CbgCIH1lJmndmrZgKgEV7M3-oog0aTWFWO55Iv3KWBc72OFlmCsYozkGm4MdRDdZBzDD8C0VtDoTZq5MqN5QOlh5vvKF48h78T0WhYnjj-Be9guSWxMM5i7A7-UI70kZuQKD3TCKGqkdmqN7K8EBvu8j2kxYVY6HSfxg8S-_ISnQWriBwFA14-nxe1jNneyAvwaJeB04YPqHCYtW9Q_1WZytpthgJLmR7Wwhu7WvSLbg3lQ2DtthZzQ6ozziw5BGs8_vmyT22Km9ynNKUD9xozIF4qkcLK4mmWJVegwDpU2ySzHCzPd10'
describe("test eventHandler", () => {

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
        Authorization: 'Bearer ' + validJWT
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
      principalId: "user-12312312312312",
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
        Authorization: 'Bearer ' + validJWT
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
      principalId: "user-12312312312312",
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
        Authorization: 'Bearer ' + validJWT
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
        Authorization: 'Bearer ' + validJWT
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

    try {
      await EventHandler.handleEvent(event); 
      expect().fail('Expected an exception')
    } catch(e){
      expect(e.toJSON()).to.deep.equal({
        name: 'AuthenticationError',
        message: 'Error validating token',
        meta: {
          validKeys: []
        },
        retriable: true
      });
      expect(e.message).to.be.equal('Error validating token');
    }
    
  })
});
