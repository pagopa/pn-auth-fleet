import { expect } from 'chai';
import sinon from 'sinon';
import { 
    validateOriginalMethodHeader, 
    validateOriginalURLHeader,
    findMicroserviceConfig
} from '../app/requestValidation.js';

describe('Microservice Config Mapping Tests', () => {
    
    let originalEnv;
    
    beforeEach(() => {
        originalEnv = { ...process.env };
        
        process.env.LOLLIPOP_AUTHORIZER_CONFIG = JSON.stringify([
            {
                "substringURL": "/mandate/",
                "methods": ["POST"],
                "URLpattern": "^https://api-app\\.io\\.pagopa\\.it/api/v1/mandate/.*$"
            },
            {
                "substringURL": "/delivery/",
                "methods": ["GET"],
                "URLpattern": "^https://api-app\\.io\\.pagopa\\.it/api/v1/delivery/[a-z]+$"
            }
        ]);
    });
    
    afterEach(() => {
        process.env = originalEnv;
        sinon.restore();
    });
    
    describe('findMicroserviceConfig', () => {
        it('should find config for /mandate/ endpoint', () => {
            const url = "https://api-app.io.pagopa.it/api/v1/mandate/create";
            const config = findMicroserviceConfig(url);
            
            expect(config).to.not.be.null;
            expect(config.substringURL).to.equal("/mandate/");
            expect(config.methods).to.deep.equal(["POST"]);
        });
        
        it('should find config for /delivery/ endpoint', () => {
            const url = "https://api-app.io.pagopa.it/api/v1/delivery/status";
            const config = findMicroserviceConfig(url);
            
            expect(config).to.not.be.null;
            expect(config.substringURL).to.equal("/delivery/");
            expect(config.methods).to.deep.equal(["GET"]);
        });
        
        it('should return null when no match found', () => {
            const url = "https://api-app.io.pagopa.it/api/v1/unknown/endpoint";
            const config = findMicroserviceConfig(url);
            
            expect(config).to.be.null;
        });
        
        it('should return null when config is not set', () => {
            delete process.env.LOLLIPOP_AUTHORIZER_CONFIG;
            const url = "https://api-app.io.pagopa.it/api/v1/mandate/create";
            const config = findMicroserviceConfig(url);
            
            expect(config).to.be.null;
        });
    });
    
    describe('validateOriginalMethodHeader with specific config', () => {
        it('should accept POST for /mandate/ endpoint', async () => {
            const method = "POST";
            const url = "https://api-app.io.pagopa.it/api/v1/mandate/create";
            
            await expect(
                validateOriginalMethodHeader(method, url)
            ).to.not.be.rejected;
        });
        
        it('should reject GET for /mandate/ endpoint', async () => {
            const method = "GET";
            const url = "https://api-app.io.pagopa.it/api/v1/mandate/create";
            
            try {
                await validateOriginalMethodHeader(method, url);
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.errorCode).to.equal('UNEXPECTED_ORIGINAL_METHOD');
            }
        });
        
        it('should accept GET for /delivery/ endpoint', async () => {
            const method = "GET";
            const url = "https://api-app.io.pagopa.it/api/v1/delivery/status";
            
            await expect(
                validateOriginalMethodHeader(method, url)
            ).to.not.be.rejected;
        });
        
        it('should reject POST for /delivery/ endpoint', async () => {
            const method = "POST";
            const url = "https://api-app.io.pagopa.it/api/v1/delivery/status";
            
            try {
                await validateOriginalMethodHeader(method, url);
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.errorCode).to.equal('UNEXPECTED_ORIGINAL_METHOD');
            }
        });
    });
    
    describe('validateOriginalURLHeader with specific config', () => {
        it('should accept valid URL for /delivery/ endpoint', async () => {
            const url = "https://api-app.io.pagopa.it/api/v1/delivery/status";
            
            await expect(
                validateOriginalURLHeader(url)
            ).to.not.be.rejected;
        });
        
        it('should reject invalid URL for /delivery/ endpoint (contains numbers)', async () => {
            const url = "https://api-app.io.pagopa.it/api/v1/delivery/status123";
            
            try {
                await validateOriginalURLHeader(url);
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.errorCode).to.equal('UNEXPECTED_ORIGINAL_URL');
            }
        });
        
        it('should accept valid URL for /mandate/ endpoint', async () => {
            const url = "https://api-app.io.pagopa.it/api/v1/mandate/create";
            
            await expect(
                validateOriginalURLHeader(url)
            ).to.not.be.rejected;
        });
    });
    
    describe('Fallback to global config', () => {
        beforeEach(() => {
            delete process.env.LOLLIPOP_AUTHORIZER_CONFIG;
        });
        
        it('should use global config when no specific config found', async () => {
            process.env.EXPECTED_FIRST_LC_ORIGINAL_METHOD = "GET;POST";
            process.env.EXPECTED_FIRST_LC_ORIGINAL_URL = "^https://api-app\\.io\\.pagopa\\.it/.*$";
            
            const method = "GET";
            const url = "https://api-app.io.pagopa.it/api/v1/unknown/endpoint";
            
            await expect(
                validateOriginalMethodHeader(method, url)
            ).to.not.be.rejected;
            
            await expect(
                validateOriginalURLHeader(url)
            ).to.not.be.rejected;
        });
        
        it('should reject method not in global config', async () => {
            process.env.EXPECTED_FIRST_LC_ORIGINAL_METHOD = "POST";
            
            const method = "GET";
            const url = "https://api-app.io.pagopa.it/api/v1/unknown/endpoint";
            
            try {
                await validateOriginalMethodHeader(method, url);
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.errorCode).to.equal('UNEXPECTED_ORIGINAL_METHOD');
            }
        });
    });
    
    describe('Config validation edge cases', () => {
        it('should handle malformed JSON config gracefully', () => {
            process.env.LOLLIPOP_AUTHORIZER_CONFIG = "invalid json{";
            
            const url = "https://api-app.io.pagopa.it/api/v1/mandate/create";
            const config = findMicroserviceConfig(url);
            
            expect(config).to.be.null;
        });
        
        it('should handle empty config array', () => {
            process.env.LOLLIPOP_AUTHORIZER_CONFIG = "[]";
            
            const url = "https://api-app.io.pagopa.it/api/v1/mandate/create";
            const config = findMicroserviceConfig(url);
            
            expect(config).to.be.null;
        });
        
        it('should handle config without required fields', () => {
            process.env.LOLLIPOP_AUTHORIZER_CONFIG = JSON.stringify([
                {
                    "substringURL": "/test/",
                    "URLpattern": "^https://.*$"
                }
            ]);
            
            const url = "https://api-app.io.pagopa.it/api/v1/test/endpoint";
            const config = findMicroserviceConfig(url);
            
            expect(config).to.be.null;
        });
    });
    
    describe('Multiple matching substrings', () => {
        beforeEach(() => {
            process.env.LOLLIPOP_AUTHORIZER_CONFIG = JSON.stringify([
                {
                    "substringURL": "/api/",
                    "methods": ["GET"],
                    "URLpattern": "^https://api-app\\.io\\.pagopa\\.it/api/.*$"
                },
                {
                    "substringURL": "/api/v1/mandate/",
                    "methods": ["POST"],
                    "URLpattern": "^https://api-app\\.io\\.pagopa\\.it/api/v1/mandate/.*$"
                }
            ]);
        });
        
        it('should return first matching config', () => {
            const url = "https://api-app.io.pagopa.it/api/v1/mandate/create";
            const config = findMicroserviceConfig(url);
            
            expect(config).to.not.be.null;
            expect(config.substringURL).to.equal("/api/");
        });
    });
});
