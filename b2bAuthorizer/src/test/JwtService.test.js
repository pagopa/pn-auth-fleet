// tests about JwtService clas

const chai = require("chai");
const chaiSubset = require('chai-subset');
chai.use(chaiSubset);

const JwtService = require("../app/modules/jwt");
const { expect} = chai;
const fs = require('fs');
const exp = require("constants");

describe("JwtService tests", function () {
    it("JWT Decode fail", function () {
        const jwtService = new JwtService();
        const token = "invalid_jwt_token"
        expect(() => jwtService.decodeToken(token)).to.throw("Unable to decode input JWT string");
    });

    it("JWT decode OK", function () {
        const jwtService = new JwtService();
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
        const jwtService = new JwtService();
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
        const jwtService = new JwtService();
        const jwks = fs.readFileSync('./src/test/resources/jwks.json');
        const jwksAsBuffer = Buffer.from(jwks, 'utf8');
        const jwt = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2lkIn0.eyJhdWQiOiJodHRwczovL3Rlc3QtaXNzdWVyLmRldi5ub3RpZmljaGVkaWdpdGFsaS5pdCIsImlzcyI6Imh0dHBzOi8vdGVzdC1pc3N1ZXIuZGV2Lm5vdGlmaWNoZWRpZ2l0YWxpLml0IiwianRpIjoiMTIzMTIzMTIzMTIzMTIiLCJpYXQiOjE3MDc5ODgxMTR9.eLAIp3T1xQ1UrHYET2wECIX3-zxm_7vQwIxILbmrVRHqJIFvOLDD9XkB0e8_L_D9tsfq1dV3YiEiF_JkxLpmUWAPCYfsDKm2eWkBSBFjWWcvrus6LBaueuMquKPeNLVT0mdWZNtONLY-ZDHNcmySUhdvBjnevW8XBozWfF7tFsQc2igVGsDUG0I9xbNsiYZDhRmNebmiwj2Mrr7TNNSZ4ytHtwNvqikw7asV-MGVzUpqwT9IoZoK--E1YXx4go9gAS7ZDbVzGo5BEhhwKjlPJxtVLJ1luN_gVN3et-4s7YVj0VsyC2pwWtrGedSJcoIbBbWnPfqeFWl1Z7X6Ph9fJfMGckiYfc6kv0WPWR7uQcOfdFaDdYzFYBnB7sPA4WQSQ8ipyzm4h3vaGHhRkM8CnNpNs4M0XbhGEOQYdSeQKYMBqaU9mMHfQ2R2GvYj7_KjKtW2ZKDjga4tFYfGTi9fxOWgiqCuuF9JHvsRIGhW46TBU1sUlsKt5TSReUg1oGsygTkZF5ofVRq6F0H_H2XbG9f2MTz4ktqnygRg6xJSDQWUI_9twDQBtjmyltFb1uwE3GQlTqLAH5s8KuhgVvFbEPNyDpELnZbMPKrMLKAeVPAJCM9zNifZTYKgEbFlhkofyOrrsjQI4A3dSY7SSgIh9CJlsdPBCXf3ndL67cAs9HA';

        const issuerInfo = {
            cfg: {
                iss: "https://test-issuer.dev.notifichedigitali.it"
            },
            jwksCache: [ { JWKSBody: jwksAsBuffer } ]
        }

        jwtService.validateToken(issuerInfo, {
            header: {
                kid: "test-kid"
            },
            payload: {
                aud: "https://test-issuer.dev.notifichedigitali.it",
                iss: "https://test-issuer.dev.notifichedigitali.it",
                jti: "12312312312312"
            }
        }, jwt,
        {
            requestContext: {
                domainName: "test-issuer.dev.notifichedigitali.it"
            }
        });

        expect(true).to.equal(true); // just verify that no exceptions are thrown
    });

    it('JWT validate KO - issuer not valid', function() {
        const jwtService = new JwtService();
        const jwks = fs.readFileSync('./src/test/resources/jwks.json');
        const jwksAsBuffer = Buffer.from(jwks, 'utf8');
        const jwt = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IlRBLWtpZCJ9.eyJhdWQiOiJodHRwczovL2FwaS5yYWRkLmRldi5ub3RpZmljaGVkaWdpdGFsaS5pdCIsImlzcyI6InRlc3QtaXNzdWVyLmRldi5ub3RpZmljaGVkaWdpdGFsaS5pdCIsImp0aSI6IjEyMzEyMzEyMzEyMzEyNTUiLCJpYXQiOjE3MDk3MjUxMzB9.kCYpIBX7gPPiTez2j-FdQZNYHWKg5jpxI_l-V0EyDjnxck13TAJ18UsUeWn-QFDJHGRT-fuXyWb_9sgc2nyR9p0JvJufFHTx2XGoLetdWCipjUQ6pOfCPx5aQsb-QFX2lDVvZXuutQ9LBZ_lXoNWxhXYFiT0AaVqn3RvtR0xTiGWTHRGvAdLCEsFhYoquTkGmzn-Ji46rMugg9poluUQ-sHsXPgPFdrsyY3wQsHh44c1T9WdN1wFn4fwI0QGoP8XWSGMYrKzxdpX1yqycPLfuZP4WDWhsSDKLBKRaakJRCmy3XwoOlYpZ5QpB3PvAiucLsQ_eGVxPsASB1MwaiORxSPr0CGstCT9u3_L4hRnP6B5n-WV-qaYniTHIHzK6CH16v2MhlXvCuTAqoMmZiT0qud3QEHAJgLL6b9x-jUo6-hHFu2WAXpx1LKVFNmEA9zmqcKHRvOZNkMTwouLsW2l3jbHd0NsNYqPwlnbMPHq6krxQ7ZhYNm93tbJOkH8jp9iZKQUjFf3OvqiLo6Z9qiUf_qrR_h0sRD5NUIeKK1oAQPEqvnCxBS8ARvetx0aS1rwbzfmGmGF_Rx7Tkg_wKsD30CZVQlq_R1KXhDfwG-l2Kgqxj14J10LlINFeUp7KyqJ6_a64QX7yBM_QSFFBBzavQVLUMd6G9Fqwqzce5fjYcc';

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
            }, jwt,
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
        const jwtService = new JwtService();
        const jwks = fs.readFileSync('./src/test/resources/jwks.json');
        const jwksAsBuffer = Buffer.from(jwks, 'utf8');
        const jwt = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IlRBLWtpZCJ9.eyJhdWQiOiJodHRwczovL2FwaS5yYWRkLmRldi5ub3RpZmljaGVkaWdpdGFsaS5pdCIsImlzcyI6InRlc3QtaXNzdWVyLmRldi5ub3RpZmljaGVkaWdpdGFsaS5pdCIsImp0aSI6IjEyMzEyMzEyMzEyMzEyNTUiLCJpYXQiOjE3MDk3MjUxMzB9.kCYpIBX7gPPiTez2j-FdQZNYHWKg5jpxI_l-V0EyDjnxck13TAJ18UsUeWn-QFDJHGRT-fuXyWb_9sgc2nyR9p0JvJufFHTx2XGoLetdWCipjUQ6pOfCPx5aQsb-QFX2lDVvZXuutQ9LBZ_lXoNWxhXYFiT0AaVqn3RvtR0xTiGWTHRGvAdLCEsFhYoquTkGmzn-Ji46rMugg9poluUQ-sHsXPgPFdrsyY3wQsHh44c1T9WdN1wFn4fwI0QGoP8XWSGMYrKzxdpX1yqycPLfuZP4WDWhsSDKLBKRaakJRCmy3XwoOlYpZ5QpB3PvAiucLsQ_eGVxPsASB1MwaiORxSPr0CGstCT9u3_L4hRnP6B5n-WV-qaYniTHIHzK6CH16v2MhlXvCuTAqoMmZiT0qud3QEHAJgLL6b9x-jUo6-hHFu2WAXpx1LKVFNmEA9zmqcKHRvOZNkMTwouLsW2l3jbHd0NsNYqPwlnbMPHq6krxQ7ZhYNm93tbJOkH8jp9iZKQUjFf3OvqiLo6Z9qiUf_qrR_h0sRD5NUIeKK1oAQPEqvnCxBS8ARvetx0aS1rwbzfmGmGF_Rx7Tkg_wKsD30CZVQlq_R1KXhDfwG-l2Kgqxj14J10LlINFeUp7KyqJ6_a64QX7yBM_QSFFBBzavQVLUMd6G9Fqwqzce5fjYcc';

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
            }, jwt,
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
        const jwtService = new JwtService();
        const jwks = fs.readFileSync('./src/test/resources/jwks.json');
        const jwksAsBuffer = Buffer.from(jwks, 'utf8');
        const jwt = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IlRBLWtpZCJ9.eyJhdWQiOiJodHRwczovL2FwaS5yYWRkLmRldi5ub3RpZmljaGVkaWdpdGFsaS5pdCIsImlzcyI6InRlc3QtaXNzdWVyLmRldi5ub3RpZmljaGVkaWdpdGFsaS5pdCIsImp0aSI6IjEyMzEyMzEyMzEyMzEyNTUiLCJpYXQiOjE3MDk3MjUxMzB9.kCYpIBX7gPPiTez2j-FdQZNYHWKg5jpxI_l-V0EyDjnxck13TAJ18UsUeWn-QFDJHGRT-fuXyWb_9sgc2nyR9p0JvJufFHTx2XGoLetdWCipjUQ6pOfCPx5aQsb-QFX2lDVvZXuutQ9LBZ_lXoNWxhXYFiT0AaVqn3RvtR0xTiGWTHRGvAdLCEsFhYoquTkGmzn-Ji46rMugg9poluUQ-sHsXPgPFdrsyY3wQsHh44c1T9WdN1wFn4fwI0QGoP8XWSGMYrKzxdpX1yqycPLfuZP4WDWhsSDKLBKRaakJRCmy3XwoOlYpZ5QpB3PvAiucLsQ_eGVxPsASB1MwaiORxSPr0CGstCT9u3_L4hRnP6B5n-WV-qaYniTHIHzK6CH16v2MhlXvCuTAqoMmZiT0qud3QEHAJgLL6b9x-jUo6-hHFu2WAXpx1LKVFNmEA9zmqcKHRvOZNkMTwouLsW2l3jbHd0NsNYqPwlnbMPHq6krxQ7ZhYNm93tbJOkH8jp9iZKQUjFf3OvqiLo6Z9qiUf_qrR_h0sRD5NUIeKK1oAQPEqvnCxBS8ARvetx0aS1rwbzfmGmGF_Rx7Tkg_wKsD30CZVQlq_R1KXhDfwG-l2Kgqxj14J10LlINFeUp7KyqJ6_a64QX7yBM_QSFFBBzavQVLUMd6G9Fqwqzce5fjYcc';

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
            }, jwt,
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

    it('JWT validate KO - kid not valid', function() {
        const jwtService = new JwtService();
        const jwks = fs.readFileSync('./src/test/resources/jwks.json');
        const jwksAsBuffer = Buffer.from(jwks, 'utf8');
        const jwt = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2lkIn0.eyJhdWQiOiJodHRwczovL3Rlc3QtaXNzdWVyLmRldi5ub3RpZmljaGVkaWdpdGFsaS5pdCIsImlzcyI6Imh0dHBzOi8vdGVzdC1pc3N1ZXIuZGV2Lm5vdGlmaWNoZWRpZ2l0YWxpLml0IiwianRpIjoiMTIzMTIzMTIzMTIzMTIiLCJpYXQiOjE3MDc5MjQ5ODIsImV4cCI6MTcwNzkyODU4Mn0.pWFl_CXG9Xrh3cqBo0uYW1HCTkAjeSesOT4Y3T17cBCNvwllvs7KVEMfYmEP06ceTDlr6v6puQWzcpVIKfYWPfJfLCJ6XYcA0U7AlthALFNpR3nNgaaQVB-pVYCIiLFkN-_kQLMAikvl4F4KLzWNTqw3vwFIMQ33DsOP_m_cvmoQY0SbwH1Z2O2q290j3mzkMbv12PdFirBmUhxgPdFuouM-nOHKqZWHyrjFdpcwItEZ1LYG5lJO_qgmIpl_cE9sF-Kc4F6zcoFmUjHEdN_xgoj3s4TgQyhld0xePVG4orUV8sbvh5U1WhQhKQlNBrpHC2FBzbs32LF5vG2KAEewFyD-3_kbIIqbahZvsXvndjbXcEKmnnlv0IDqL4wxd68QTvqQ769m8KgK7xeZvtDSB3ra1_f6vGq7ynT4BC51lIzUue3xd1mO2MBi9nFjhvsf0LNHcojwBbhu2unqlpZb7BmwLCepw_YyW45p5BoRhOXRDVfA9WadF96_VNFZG_6zdnMSMfhQQmFSqnog9BzwuTrPhMwp8_VvN_5thZaJ0sCrZpYtIlxcjgUXgrfABRAuOcWoeNj0N__OjQCdy-9biMDeLNirVGZNKIJgKrK1yilSmjHjkFMdz_b6cgP7Wjchvf0EJes5MBibGk2wkLZJsVlglCyv_aVALW8kE1KHdCE';

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
            }, jwt,
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
        const jwtService = new JwtService();
        const jwks = fs.readFileSync('./src/test/resources/jwks.json');
        const jwksAsBuffer = Buffer.from(jwks, 'utf8');
        const jwt = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2lkIn0.eyJhdWQiOlsiaHR0cHM6Ly9hcGkxLnJhZGQuZGV2Lm5vdGlmaWNoZWRpZ2l0YWxpLml0IiwiaHR0cHM6Ly9hcGkucmFkZC5kZXYubm90aWZpY2hlZGlnaXRhbGkuaXQiXSwiaXNzIjoidGVzdC1pc3N1ZXIuZGV2Lm5vdGlmaWNoZWRpZ2l0YWxpLml0IiwianRpIjoiMTIzMTIzMTIzMTIzMTIiLCJpYXQiOjE3MDg3MDAwNDV9.n1-fxYGuZOPqCFkBshBWN8GsO3eLXGr5b7_FQqK2OXBPUy0MvPCmnr2xIbw0jDeLZqPdmtZqgpjbHMzHflVXs-CG-PurIRHUCm7pTKZpkN7wGYX3WmCVW5c33HDiD1j15_NlUJkEnLmkjWJ-T0Y6cjgiIooY1BkBItQ0CP3iZU6RmMlLuHcDvRK_jXgbepA55JRG4QLyiTdd37AcamX_29Y1n2cBHzxAh9lW5ibw-10VrBsM1U7wHP3sJqb25QZKpYxvoROhJCPrSfs13ReQQv1NMlf8JlZQJ4ZLkwuxJVIEU16xH_ij93WRKZZEdiCVKDVb4zSoR5ARUqrP9LiIRSElMkmEdrrfWHcwlmdEsn6HXXjG_aaCjng_k7LBFy7tDtqYMD81-6JZD7Zch9Qefgr6s0PBvaE06u5MfaAiCsbxW3aYAGyOywSZCWzHA6S1MC_EUBJXrpMTyTOSLn_nBsweVs1j496ikn-s79cc6iv83xDsCZeshuopxkdkfcRBYqPdqkV_zSGybfoP-Xv3OmJRuEm2k67LuADV1zCJiPqi0Ph9joPiGepC3jsSmh7YKD3652TWXxSk6zJzznA1e4zGL9K8LUAmeAFJs17AyjLibpw5pUCMto_WCFKPFDdMC0NnbkNVOdKJkKNO8ZDHZ938QbOLeFPpa1OlYq5pXjA';

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
            }, jwt,
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
        const jwtService = new JwtService();
        const jwks = fs.readFileSync('./src/test/resources/jwks.json');
        const jwksAsBuffer = Buffer.from(jwks, 'utf8');
        const jwt = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2lkIn0.eyJhdWQiOlsiaHR0cHM6Ly9hcGkxLnJhZGQuZGV2Lm5vdGlmaWNoZWRpZ2l0YWxpLml0IiwiaHR0cHM6Ly9hcGkucmFkZC5kZXYubm90aWZpY2hlZGlnaXRhbGkuaXQiXSwiaXNzIjoidGVzdC1pc3N1ZXIuZGV2Lm5vdGlmaWNoZWRpZ2l0YWxpLml0IiwianRpIjoiMTIzMTIzMTIzMTIzMTIiLCJpYXQiOjE3MDg3MDAwNDV9.n1-fxYGuZOPqCFkBshBWN8GsO3eLXGr5b7_FQqK2OXBPUy0MvPCmnr2xIbw0jDeLZqPdmtZqgpjbHMzHflVXs-CG-PurIRHUCm7pTKZpkN7wGYX3WmCVW5c33HDiD1j15_NlUJkEnLmkjWJ-T0Y6cjgiIooY1BkBItQ0CP3iZU6RmMlLuHcDvRK_jXgbepA55JRG4QLyiTdd37AcamX_29Y1n2cBHzxAh9lW5ibw-10VrBsM1U7wHP3sJqb25QZKpYxvoROhJCPrSfs13ReQQv1NMlf8JlZQJ4ZLkwuxJVIEU16xH_ij93WRKZZEdiCVKDVb4zSoR5ARUqrP9LiIRSElMkmEdrrfWHcwlmdEsn6HXXjG_aaCjng_k7LBFy7tDtqYMD81-6JZD7Zch9Qefgr6s0PBvaE06u5MfaAiCsbxW3aYAGyOywSZCWzHA6S1MC_EUBJXrpMTyTOSLn_nBsweVs1j496ikn-s79cc6iv83xDsCZeshuopxkdkfcRBYqPdqkV_zSGybfoP-Xv3OmJRuEm2k67LuADV1zCJiPqi0Ph9joPiGepC3jsSmh7YKD3652TWXxSk6zJzznA1e4zGL9K8LUAmeAFJs17AyjLibpw5pUCMto_WCFKPFDdMC0NnbkNVOdKJkKNO8ZDHZ938QbOLeFPpa1OlYq5pXjA';

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
        }, jwt,
        {
            requestContext: {
                domainName: "api.radd.dev.notifichedigitali.it"
            }
        });
        expect(true).to.equal(true); // just verify that no exceptions are thrown
        
    });
});