// tests about JwtService clas

const chai = require("chai");
const chaiSubset = require('chai-subset');
chai.use(chaiSubset);

const JwtService = require("../app/modules/jwt");
const { expect} = chai;
const fs = require('fs');

// dev notes: if you need to refresh JWT token, you can use the following code with the key stored in secret of Dev Core "test/pn-auth-fleet-unit-test-radd-jwt-key":
// https://github.com/pagopa/pn-troubleshooting/blob/main/jwt-auth/generate-jwt.js
//const jwt1yearValid = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IlRBLWtpZCJ9.eyJhdWQiOiJodHRwczovL2FwaS5yYWRkLmRldi5ub3RpZmljaGVkaWdpdGFsaS5pdCIsImlzcyI6InRlc3QtaXNzdWVyLmRldi5ub3RpZmljaGVkaWdpdGFsaS5pdCIsImp0aSI6IjEyMzEyMzEyMzEyMzEyNTUiLCJpYXQiOjE3MTAxNDM2OTYsImV4cCI6MTc0MTcwMTI5Nn0.l304g6c3E16DbgUTl1vLIRB4SvHKHY-JHaxWaDruDs5qFQWtnygc5kMIcvktuIEbfIUgae5AfyaSzGa-gFmGytnZ2teUa9FAQ_OOl_XmP-MfvwKyARNBUKMn24wOUCY236SWKrTI1lOTyUfgjqQERdapf3ge-WhzLXlurw3MaEMoWrHahJLS6PQHGWCBA4Y4TCsihaxGPvw4DD4KllcbJx8Fb9ymi30Z-wsoPDOL4KHcNyEqdzl5roQ-9sCYpMAFdPfyO6HHmfzDbUutBBkccHETMwLqAxC67Jrnfn1Cu2JkcK4hpSKHWMg1PX3vs4jVV3fGfaJ6o2sf-q6oai3hQhOMvbQbwbpY23kMhKlYoSrzERa19IE4oJsifggnZrQTdF6KP9vqpvyt4yVi7EyUv0vwxR5jFjb_hMH_1MdYmbzZiz9pDgOA_4CbBcN9119Qm39RmjB1rlozm1ntdbIEKwiXcR_42s345bRsKNAmzeYZ94KQgyGy1--eksQ2qjXbb-DDI_mmfEGoJmFe_SG3h-OObhJJrXa8PvNEBQERjuwsyj1KQPc836TXavffzi2hcWB7T_medkUbetuI0UhgsApH0stcwABYtHjD3rsnC9ppr4wRN1LlOo8DYOOmjtnv-KRya4AY8ea3qw7O8kyPcaMoLvMxZ7LsveuvNn-gQ7E' // expires on March 11th 2025
const jwt1yearValid = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2lkIn0.eyJhdWQiOiJodHRwczovL2FwaS5yYWRkLmRldi5ub3RpZmljaGVkaWdpdGFsaS5pdCIsImlzcyI6InRlc3QtaXNzdWVyLmRldi5ub3RpZmljaGVkaWdpdGFsaS5pdCIsImp0aSI6IjEyMzEyMzEyMzEyMzEyNTUiLCJpYXQiOjE3MTAxNTE3ODUsImV4cCI6MTc0MTcwOTM4NX0.DYs7wKmfL-xchc40W8ptr2ySDRhh5ZbKknGoJO96qYfjt3Pdp3RA-Sr4wHM8UbY3FjyLtMQgGccdvgOd20GFJrM0jOaRLiPAoMXSIiCYdVkOh0VHEnuFNVXbRdLFSUcGbxddr12bIo4MncJx0UuIF3gMze5fW6urNaBTmKLIK-uvhB5EmGENrjoChHdiHaScRk3-ufk5PIvQHK2l6Kvfjsa0SruZX13kOA9IlIdH9DxZ7LT10-wkffYS72ClhCVyiqkFBxy6J8gdzugi3L6gIPSN9MAJSmsYHENC6i2I7XjfqhO1iglNzqloV4ElGMTuKiqxe-koM_pOkM8UQ55yFAGWSmFWdFSwDc7pukdaXuXwcR4Rg6zFvyFHrwlO7IA_TRt77EYHmpen5LoFH2GCT4p-jUCG5GmDyIuplZMzRD3WCzk4geuOoUKeW75AN0_F5O2L7Iem-LYz4pqYaNzwu8uLYcrmZSKNSGzaiNvSlFDdLQpVwFu9k6GR0RU6Ll6iC7BLs85fXzaaSnP6Av0bnp1DOnW4FGxBl8WCSoV2vbLiICEOAJVm39BcsI1q2PQ8-3CwkYPuPKW2BFM_Bn_9g5wrajMhliV1oayPnnn2kn1qRRvaUb2CAlfumEBsHg0C0o0biDF_zo4eTX_g6KTuKFLPi-lzy6pLfQPq8rBBbro' // expires on March 11th 2025

const JWT_MAX_AGE_SECONDS_1_YEAR = 31536000;
const JWT_MAX_AGE_SECONDS_1_MINUTE = 60;
const JWT_CLOCK_TOLERANCE_SECONDS = 60;

describe("JwtService tests", function () {
    it("JWT Decode fail", function () {
        const jwtService = new JwtService(JWT_MAX_AGE_SECONDS_1_YEAR, JWT_CLOCK_TOLERANCE_SECONDS);
        const token = "invalid_jwt_token"
        expect(() => jwtService.decodeToken(token)).to.throw("Unable to decode input JWT string");
    });

    it("JWT decode OK", function () {
        const jwtService = new JwtService(JWT_MAX_AGE_SECONDS_1_YEAR, JWT_CLOCK_TOLERANCE_SECONDS);
        const jwt = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2lkIn0.eyJhdWQiOiJodHRwczovL3Rlc3QtaXNzdWVyLmRldi5ub3RpZmljaGVkaWdpdGFsaS5pdCIsImlzcyI6Imh0dHBzOi8vdGVzdC1pc3N1ZXIuZGV2Lm5vdGlmaWNoZWRpZ2l0YWxpLml0IiwianRpIjoiMTIzMTIzMTIzMTIzMTIiLCJpYXQiOjE3MDc5MjQ5ODIsImV4cCI6MTcwNzkyODU4Mn0.pWFl_CXG9Xrh3cqBo0uYW1HCTkAjeSesOT4Y3T17cBCNvwllvs7KVEMfYmEP06ceTDlr6v6puQWzcpVIKfYWPfJfLCJ6XYcA0U7AlthALFNpR3nNgaaQVB-pVYCIiLFkN-_kQLMAikvl4F4KLzWNTqw3vwFIMQ33DsOP_m_cvmoQY0SbwH1Z2O2q290j3mzkMbv12PdFirBmUhxgPdFuouM-nOHKqZWHyrjFdpcwItEZ1LYG5lJO_qgmIpl_cE9sF-Kc4F6zcoFmUjHEdN_xgoj3s4TgQyhld0xePVG4orUV8sbvh5U1WhQhKQlNBrpHC2FBzbs32LF5vG2KAEewFyD-3_kbIIqbahZvsXvndjbXcEKmnnlv0IDqL4wxd68QTvqQ769m8KgK7xeZvtDSB3ra1_f6vGq7ynT4BC51lIzUue3xd1mO2MBi9nFjhvsf0LNHcojwBbhu2unqlpZb7BmwLCepw_YyW45p5BoRhOXRDVfA9WadF96_VNFZG_6zdnMSMfhQQmFSqnog9BzwuTrPhMwp8_VvN_5thZaJ0sCrZpYtIlxcjgUXgrfABRAuOcWoeNj0N__OjQCdy-9biMDeLNirVGZNKIJgKrK1yilSmjHjkFMdz_b6cgP7Wjchvf0EJes5MBibGk2wkLZJsVlglCyv_aVALW8kE1KHdCE';
        const decodedJwt = jwtService.decodeToken(jwt);
        expect(decodedJwt).to.containSubset({
            payload: {
                aud: "https://test-issuer.dev.notifichedigitali.it",
                iss: "https://test-issuer.dev.notifichedigitali.it",
                jti: "12312312312312"
            },
        });

    });

    it('JWT exteract essential fields', function () {  
        const jwtService = new JwtService(JWT_MAX_AGE_SECONDS_1_YEAR, JWT_CLOCK_TOLERANCE_SECONDS);
        const jwt = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2lkIn0.eyJhdWQiOiJodHRwczovL3Rlc3QtaXNzdWVyLmRldi5ub3RpZmljaGVkaWdpdGFsaS5pdCIsImlzcyI6Imh0dHBzOi8vdGVzdC1pc3N1ZXIuZGV2Lm5vdGlmaWNoZWRpZ2l0YWxpLml0IiwianRpIjoiMTIzMTIzMTIzMTIzMTIiLCJpYXQiOjE3MDc5MjQ5ODIsImV4cCI6MTcwNzkyODU4Mn0.pWFl_CXG9Xrh3cqBo0uYW1HCTkAjeSesOT4Y3T17cBCNvwllvs7KVEMfYmEP06ceTDlr6v6puQWzcpVIKfYWPfJfLCJ6XYcA0U7AlthALFNpR3nNgaaQVB-pVYCIiLFkN-_kQLMAikvl4F4KLzWNTqw3vwFIMQ33DsOP_m_cvmoQY0SbwH1Z2O2q290j3mzkMbv12PdFirBmUhxgPdFuouM-nOHKqZWHyrjFdpcwItEZ1LYG5lJO_qgmIpl_cE9sF-Kc4F6zcoFmUjHEdN_xgoj3s4TgQyhld0xePVG4orUV8sbvh5U1WhQhKQlNBrpHC2FBzbs32LF5vG2KAEewFyD-3_kbIIqbahZvsXvndjbXcEKmnnlv0IDqL4wxd68QTvqQ769m8KgK7xeZvtDSB3ra1_f6vGq7ynT4BC51lIzUue3xd1mO2MBi9nFjhvsf0LNHcojwBbhu2unqlpZb7BmwLCepw_YyW45p5BoRhOXRDVfA9WadF96_VNFZG_6zdnMSMfhQQmFSqnog9BzwuTrPhMwp8_VvN_5thZaJ0sCrZpYtIlxcjgUXgrfABRAuOcWoeNj0N__OjQCdy-9biMDeLNirVGZNKIJgKrK1yilSmjHjkFMdz_b6cgP7Wjchvf0EJes5MBibGk2wkLZJsVlglCyv_aVALW8kE1KHdCE';
        const decodedJwt = jwtService.decodeToken(jwt);
        const essentialFields = jwtService.extractEssentialFields(decodedJwt);
        expect(essentialFields).to.containSubset({
            aud: "https://test-issuer.dev.notifichedigitali.it",
            iss: "https://test-issuer.dev.notifichedigitali.it",
            jti: "12312312312312",
            kid: "test-kid"
        });
    });

    it('JWT validate ok', function() {
        // 1 year
        const jwtService = new JwtService(JWT_MAX_AGE_SECONDS_1_YEAR, JWT_CLOCK_TOLERANCE_SECONDS);
        const jwks = fs.readFileSync('./src/test/resources/jwks.json');
        const jwksAsBuffer = Buffer.from(jwks, 'utf8');
        const issuerInfo = {
            cfg: {
                iss: "test-issuer.dev.notifichedigitali.it"
            },
            jwksCache: [ { JWKSBody: jwksAsBuffer } ]
        }

        jwtService.validateToken(issuerInfo, {
            header: {
                kid: "test-kid"
            },
            payload: {
                aud: "https://api.radd.dev.notifichedigitali.it",
                iss: "test-issuer.dev.notifichedigitali.it",
                jti: "12312312312312"
            }
        }, jwt1yearValid,
        {
            requestContext: {
                domainName: "api.radd.dev.notifichedigitali.it"
            }
        });

        expect(true).to.equal(true); // just verify that no exceptions are thrown
    });

    it('JWT validate KO - issuer not valid', function() {
        const jwtService = new JwtService(JWT_MAX_AGE_SECONDS_1_YEAR, JWT_CLOCK_TOLERANCE_SECONDS);
        const jwks = fs.readFileSync('./src/test/resources/jwks.json');
        const jwksAsBuffer = Buffer.from(jwks, 'utf8');

        const issuerInfo = {
            cfg: {
                iss: "new-issuer.dev.notifichedigitali.it"
            },
            jwksCache: [ { JWKSBody: jwksAsBuffer } ]
        }

        try {
            jwtService.validateToken(issuerInfo, {
                header: {
                    kid: "test-kid"
                },
                payload: {
                    aud: "https://api.radd.dev.notifichedigitali.it",
                    iss: "test-issuer.dev.notifichedigitali.it",
                    jti: "12312312312312"
                }
            }, jwt1yearValid,
            {
                requestContext: {
                    domainName: "api.radd.dev.notifichedigitali.it"
                }
            });
            expect.fail('Error not thrown');
        } catch(err) {
            expect(err.message).to.be.equal("Error validating token with keyId: test-kid: jwt issuer invalid. expected: new-issuer.dev.notifichedigitali.it");

        }

    });

    it('JWT validate KO - audience not valid', function() {
        const jwtService = new JwtService(JWT_MAX_AGE_SECONDS_1_YEAR, JWT_CLOCK_TOLERANCE_SECONDS);
        const jwks = fs.readFileSync('./src/test/resources/jwks.json');
        const jwksAsBuffer = Buffer.from(jwks, 'utf8');

        const issuerInfo = {
            cfg: {
                iss: "https://test-issuer.dev.notifichedigitali.it"
            },
            jwksCache: [ { JWKSBody: jwksAsBuffer } ]
        }

        try {
            jwtService.validateToken(issuerInfo, {
                header: {
                    kid: "test-kid"
                },
                payload: {
                    aud: "https://test-issuer.dev.notifichedigitali.it",
                    iss: "https://test-issuer.dev.notifichedigitali.it",
                    jti: "12312312312312"
                }
            }, jwt1yearValid,
            {
                requestContext: {
                    domainName: "new-issuer.dev.notifichedigitali.it"
                }
            });
            expect.fail('Error not thrown');
        } catch(err) {
            expect(err.message).equal("Error validating token with keyId: test-kid: jwt audience invalid. expected: https://new-issuer.dev.notifichedigitali.it");

        }
        
    });

    it('JWT validate KO - kid not valid', function() {
        const jwtService = new JwtService(JWT_MAX_AGE_SECONDS_1_YEAR, JWT_CLOCK_TOLERANCE_SECONDS);
        const jwks = fs.readFileSync('./src/test/resources/jwks.json');
        const jwksAsBuffer = Buffer.from(jwks, 'utf8');

        const issuerInfo = {
            cfg: {
                iss: "https://test-issuer.dev.notifichedigitali.it"
            },
            jwksCache: [ { JWKSBody: jwksAsBuffer } ]
        }

        try {
            jwtService.validateToken(issuerInfo, {
                header: {
                    kid: "new-kid"
                },
                payload: {
                    aud: "https://test-issuer.dev.notifichedigitali.it",
                    iss: "https://test-issuer.dev.notifichedigitali.it",
                    jti: "12312312312312"
                }
            }, jwt1yearValid,
            {
                requestContext: {
                    domainName: "test-issuer.dev.notifichedigitali.it"
                }
            });
            expect.fail('Error not thrown');
        } catch(err) {
            expect(err.message).equal("Unable to validate token with any of the keys");

        }
        
    });

    it('JWT validate KO - algorithm not valid', function() {
        const jwtService = new JwtService(JWT_MAX_AGE_SECONDS_1_YEAR, JWT_CLOCK_TOLERANCE_SECONDS);
        const jwks = fs.readFileSync('./src/test/resources/jwks-ko.json');
        const jwksAsBuffer = Buffer.from(jwks, 'utf8');

        const issuerInfo = {
            cfg: {
                iss: "test-issuer.dev.notifichedigitali.it"
            },
            jwksCache: [ { JWKSBody: jwksAsBuffer } ]
        }

        try {
            jwtService.validateToken(issuerInfo, {
                header: {
                    kid: "test-kid"
                },
                payload: {
                    aud: "https://api.radd.dev.notifichedigitali.it",
                    iss: "test-issuer.dev.notifichedigitali.it",
                    jti: "12312312312312"
                }
            }, jwt1yearValid,
            {
                requestContext: {
                    domainName: "api.radd.dev.notifichedigitali.it"
                }
            });
            expect.fail('Error not thrown');
        } catch(err) {
            expect(err.message).equal("Unable to validate token with any of the keys");

        }
        
    });


    it('JWT validate KO - kid not valid', function() {
        const jwtService = new JwtService(JWT_MAX_AGE_SECONDS_1_YEAR, JWT_CLOCK_TOLERANCE_SECONDS);
        const jwks = fs.readFileSync('./src/test/resources/jwks.json');
        const jwksAsBuffer = Buffer.from(jwks, 'utf8');

        const issuerInfo = {
            cfg: {
                iss: "https://test-issuer.dev.notifichedigitali.it"
            },
            jwksCache: [ { JWKSBody: jwksAsBuffer } ]
        }

        try {
            jwtService.validateToken(issuerInfo, {
                header: {
                    kid: "new-kid"
                },
                payload: {
                    iss: "https://test-issuer.dev.notifichedigitali.it",
                    jti: "12312312312312"
                }
            }, jwt1yearValid,
            {
                requestContext: {
                    domainName: "test-issuer.dev.notifichedigitali.it"
                }
            });
            expect.fail('Error not thrown');
        } catch(err) {
            expect(err.message).equal("Audience not found in JWT");

        }
        
    });


    it('JWT validate KO - audience not valid (array)', function() {
        const jwtService = new JwtService(JWT_MAX_AGE_SECONDS_1_YEAR, JWT_CLOCK_TOLERANCE_SECONDS);
        const jwks = fs.readFileSync('./src/test/resources/jwks.json');
        const jwksAsBuffer = Buffer.from(jwks, 'utf8');

        const issuerInfo = {
            cfg: {
                iss: "test-issuer.dev.notifichedigitali.it"
            },
            jwksCache: [ { JWKSBody: jwksAsBuffer } ]
        }

        try {
            jwtService.validateToken(issuerInfo, {
                header: {
                    kid: "test-kid"
                },
                payload: {
                    aud: ["api1.radd.dev.notifichedigitali.it", "api.radd.dev.notifichedigitali.it"],
                    iss: "test-issuer.dev.notifichedigitali.it",
                    jti: "12312312312312"
                }
            }, jwt1yearValid,
            {
                requestContext: {
                    domainName: "api2.radd.dev.notifichedigitali.it"
                }
            });
            expect.fail('Error not thrown');
        } catch(err) {
            expect(err.message).equal("Error validating token with keyId: test-kid: jwt audience invalid. expected: https://api2.radd.dev.notifichedigitali.it");
        }
        
    });

    it('JWT validate OK - audience valid (array)', function() {
        // 1 year
        const jwtService = new JwtService(JWT_MAX_AGE_SECONDS_1_YEAR, JWT_CLOCK_TOLERANCE_SECONDS);
        const jwks = fs.readFileSync('./src/test/resources/jwks.json');
        const jwksAsBuffer = Buffer.from(jwks, 'utf8');

        const issuerInfo = {
            cfg: {
                iss: "test-issuer.dev.notifichedigitali.it"
            },
            jwksCache: [ { JWKSBody: jwksAsBuffer } ]
        }

        jwtService.validateToken(issuerInfo, {
            header: {
                kid: "test-kid"
            },
            payload: {
                aud: ["api1.radd.dev.notifichedigitali.it", "api.radd.dev.notifichedigitali.it"],
                iss: "test-issuer.dev.notifichedigitali.it",
                jti: "12312312312312"
            }
        }, jwt1yearValid,
        {
            requestContext: {
                domainName: "api.radd.dev.notifichedigitali.it"
            }
        });
        expect(true).to.equal(true); // just verify that no exceptions are thrown
       
    });


    it('JWT validate KO - max age', function() {
        // 1 minute
        const jwtService = new JwtService(JWT_MAX_AGE_SECONDS_1_MINUTE, JWT_CLOCK_TOLERANCE_SECONDS);
        const jwks = fs.readFileSync('./src/test/resources/jwks.json');
        const jwksAsBuffer = Buffer.from(jwks, 'utf8');

        const issuerInfo = {
            cfg: {
                iss: "test-issuer.dev.notifichedigitali.it"
            },
            jwksCache: [ { JWKSBody: jwksAsBuffer } ]
        }

        try {
            jwtService.validateToken(issuerInfo, {
                header: {
                    kid: "test-kid"
                },
                payload: {
                    aud: ["api1.radd.dev.notifichedigitali.it", "api.radd.dev.notifichedigitali.it"],
                    iss: "test-issuer.dev.notifichedigitali.it",
                    jti: "12312312312312"
                }
            }, jwt1yearValid,
            {
                requestContext: {
                    domainName: "api.radd.dev.notifichedigitali.it"
                }
            });

            expect.fail('Error not thrown');
        } catch(e){
            expect(e.message).to.be.equal("Error validating token with keyId: test-kid: maxAge exceeded");
        }
    });
});