// tests about JwtService clas

const chai = require("chai");
const chaiSubset = require('chai-subset');
chai.use(chaiSubset);

const JwtService = require("../app/modules/jwt");
const { expect} = chai;
const fs = require('fs');

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
        const jwt = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2lkIn0.eyJhdWQiOiJodHRwczovL3Rlc3QtaXNzdWVyLmRldi5ub3RpZmljaGVkaWdpdGFsaS5pdCIsImlzcyI6Imh0dHBzOi8vdGVzdC1pc3N1ZXIuZGV2Lm5vdGlmaWNoZWRpZ2l0YWxpLml0IiwianRpIjoiMTIzMTIzMTIzMTIzMTIiLCJpYXQiOjE3MDc5MjQ5ODIsImV4cCI6MTcwNzkyODU4Mn0.pWFl_CXG9Xrh3cqBo0uYW1HCTkAjeSesOT4Y3T17cBCNvwllvs7KVEMfYmEP06ceTDlr6v6puQWzcpVIKfYWPfJfLCJ6XYcA0U7AlthALFNpR3nNgaaQVB-pVYCIiLFkN-_kQLMAikvl4F4KLzWNTqw3vwFIMQ33DsOP_m_cvmoQY0SbwH1Z2O2q290j3mzkMbv12PdFirBmUhxgPdFuouM-nOHKqZWHyrjFdpcwItEZ1LYG5lJO_qgmIpl_cE9sF-Kc4F6zcoFmUjHEdN_xgoj3s4TgQyhld0xePVG4orUV8sbvh5U1WhQhKQlNBrpHC2FBzbs32LF5vG2KAEewFyD-3_kbIIqbahZvsXvndjbXcEKmnnlv0IDqL4wxd68QTvqQ769m8KgK7xeZvtDSB3ra1_f6vGq7ynT4BC51lIzUue3xd1mO2MBi9nFjhvsf0LNHcojwBbhu2unqlpZb7BmwLCepw_YyW45p5BoRhOXRDVfA9WadF96_VNFZG_6zdnMSMfhQQmFSqnog9BzwuTrPhMwp8_VvN_5thZaJ0sCrZpYtIlxcjgUXgrfABRAuOcWoeNj0N__OjQCdy-9biMDeLNirVGZNKIJgKrK1yilSmjHjkFMdz_b6cgP7Wjchvf0EJes5MBibGk2wkLZJsVlglCyv_aVALW8kE1KHdCE';

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
        const jwt = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2lkIn0.eyJhdWQiOiJodHRwczovL3Rlc3QtaXNzdWVyLmRldi5ub3RpZmljaGVkaWdpdGFsaS5pdCIsImlzcyI6Imh0dHBzOi8vdGVzdC1pc3N1ZXIuZGV2Lm5vdGlmaWNoZWRpZ2l0YWxpLml0IiwianRpIjoiMTIzMTIzMTIzMTIzMTIiLCJpYXQiOjE3MDc5MjQ5ODIsImV4cCI6MTcwNzkyODU4Mn0.pWFl_CXG9Xrh3cqBo0uYW1HCTkAjeSesOT4Y3T17cBCNvwllvs7KVEMfYmEP06ceTDlr6v6puQWzcpVIKfYWPfJfLCJ6XYcA0U7AlthALFNpR3nNgaaQVB-pVYCIiLFkN-_kQLMAikvl4F4KLzWNTqw3vwFIMQ33DsOP_m_cvmoQY0SbwH1Z2O2q290j3mzkMbv12PdFirBmUhxgPdFuouM-nOHKqZWHyrjFdpcwItEZ1LYG5lJO_qgmIpl_cE9sF-Kc4F6zcoFmUjHEdN_xgoj3s4TgQyhld0xePVG4orUV8sbvh5U1WhQhKQlNBrpHC2FBzbs32LF5vG2KAEewFyD-3_kbIIqbahZvsXvndjbXcEKmnnlv0IDqL4wxd68QTvqQ769m8KgK7xeZvtDSB3ra1_f6vGq7ynT4BC51lIzUue3xd1mO2MBi9nFjhvsf0LNHcojwBbhu2unqlpZb7BmwLCepw_YyW45p5BoRhOXRDVfA9WadF96_VNFZG_6zdnMSMfhQQmFSqnog9BzwuTrPhMwp8_VvN_5thZaJ0sCrZpYtIlxcjgUXgrfABRAuOcWoeNj0N__OjQCdy-9biMDeLNirVGZNKIJgKrK1yilSmjHjkFMdz_b6cgP7Wjchvf0EJes5MBibGk2wkLZJsVlglCyv_aVALW8kE1KHdCE';

        const issuerInfo = {
            cfg: {
                iss: "https://new-issuer.dev.notifichedigitali.it"
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
                    domainName: "test-issuer.dev.notifichedigitali.it"
                }
            });
            expect.fail('Error not thrown');
        } catch(err) {
            expect(err.message).to.be.equal("Unable to validate token with any of the keys");

        }
        
    });

    it('JWT validate KO - audience not valid', function() {
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
            expect(err.message).equal("Audience not matching the domainName");

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
});