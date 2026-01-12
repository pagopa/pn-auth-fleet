
const { expect } = require('chai');
const {
    extractLollipopHeaders,
    validateLollipopHeaders,
    maskSensitiveHeaders,
    extractLollipopInfo
} = require('../app/headerExtractor');

describe('HeaderExtractor Tests', () => {

    describe('extractLollipopHeaders', () => {
        it('should extract only Lollipop headers', () => {
            const headers = {
                'x-pagopa-lollipop-user-id': 'ABC123',
                'x-pagopa-lollipop-auth-jwt': 'token',
                'x-pagopa-lollipop-public-key': 'key',
                'signature': 'sig',
                'signature-input': 'input',
                'content-type': 'application/json',
                'user-agent': 'test-client',
                'host': 'api.example.com'
            };

            const extracted = extractLollipopHeaders(headers);

            expect(extracted).to.have.property('x-pagopa-lollipop-user-id');
            expect(extracted).to.have.property('x-pagopa-lollipop-auth-jwt');
            expect(extracted).to.have.property('x-pagopa-lollipop-public-key');
            expect(extracted).to.have.property('signature');
            expect(extracted).to.have.property('signature-input');
            expect(extracted).not.to.have.property('content-type');
            expect(extracted).not.to.have.property('user-agent');
            expect(extracted).not.to.have.property('host');
        });

        it('should handle case-insensitive headers', () => {
            const headers = {
                'X-PagoPA-Lollipop-User-Id': 'ABC123',
                'SIGNATURE': 'sig',
                'Content-Type': 'application/json'
            };

            const extracted = extractLollipopHeaders(headers);

            expect(Object.keys(extracted)).to.have.lengthOf(2);
            expect(extracted).to.have.property('X-PagoPA-Lollipop-User-Id');
            expect(extracted).to.have.property('SIGNATURE');
        });

        it('should return empty object if no Lollipop headers', () => {
            const headers = {
                'content-type': 'application/json',
                'user-agent': 'test'
            };

            const extracted = extractLollipopHeaders(headers);

            expect(extracted).to.be.an('object');
            expect(Object.keys(extracted)).to.have.lengthOf(0);
        });

        it('should handle null or undefined headers', () => {
            expect(() => extractLollipopHeaders(null)).to.not.throw();
            expect(() => extractLollipopHeaders(undefined)).to.not.throw();

            const extracted1 = extractLollipopHeaders(null);
            const extracted2 = extractLollipopHeaders(undefined);

            expect(Object.keys(extracted1)).to.have.lengthOf(0);
            expect(Object.keys(extracted2)).to.have.lengthOf(0);
        });
    });

    describe('validateLollipopHeaders', () => {
        it('should validate presence of required headers', () => {
            const validHeaders = {
                'x-pagopa-lollipop-user-id': 'ABC',
                'x-pagopa-lollipop-auth-jwt': 'token',
                'signature': 'sig',
                'signature-input': 'input'
            };

            const result = validateLollipopHeaders(validHeaders);

            expect(result).to.have.property('valid', true);
            expect(result).to.have.property('missing');
            expect(result.missing).to.be.an('array').that.is.empty;
        });

        it('should report missing headers', () => {
            const incompleteHeaders = {
                'x-pagopa-lollipop-user-id': 'ABC'
            };

            const result = validateLollipopHeaders(incompleteHeaders);

            expect(result).to.have.property('valid', false);
            expect(result.missing).to.be.an('array');
            expect(result.missing).to.have.lengthOf.at.least(1);
            expect(result.missing).to.include('x-pagopa-lollipop-auth-jwt');
            expect(result.missing).to.include('signature');
            expect(result.missing).to.include('signature-input');
        });

        it('should handle empty headers object', () => {
            const result = validateLollipopHeaders({});

            expect(result.valid).to.be.false;
            expect(result.missing).to.have.lengthOf(4);
        });

        it('should be case-insensitive in validation', () => {
            const headers = {
                'X-PagoPA-Lollipop-User-Id': 'ABC',
                'X-PAGOPA-LOLLIPOP-AUTH-JWT': 'token',
                'SIGNATURE': 'sig',
                'Signature-Input': 'input'
            };

            const result = validateLollipopHeaders(headers);

            expect(result.valid).to.be.true;
        });
    });

    describe('maskSensitiveHeaders', () => {
        it('should mask JWT values', () => {
            const headers = {
                'x-pagopa-lollipop-auth-jwt': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.verylongtoken.signature',
                'x-pagopa-lollipop-user-id': 'ABC123',
                'test-sensitive-header':'test'
            };

            const masked = maskSensitiveHeaders(headers);

            expect(masked['test-sensitive-header']).to.include('[MASKED]');
            expect(masked['test-sensitive-header']).to.not.equal(headers['test-sensitive-header']);
            expect(masked['x-pagopa-lollipop-user-id']).to.equal('ABC123');
        });

        it('should mask signature values', () => {
            const headers = {
                'signature': 'sig1=:MEUCIQCxverylongsignature:',
                'signature-input': 'sig1=("@method" "@path");created=1234567890',
                'test-sensitive-header': 'test',
            };

            const masked = maskSensitiveHeaders(headers);

            expect(masked['test-sensitive-header']).to.include('[MASKED]');
            expect(masked['signature-input']).to.equal(headers['signature-input']);
        });


        it('should handle short values', () => {
            const headers = {
                'test-sensitive-header': 'short'
            };

            const masked = maskSensitiveHeaders(headers);

            expect(masked['test-sensitive-header']).to.equal('[MASKED]');
        });

        it('should not modify original object', () => {
            const headers = {
                'x-pagopa-lollipop-auth-jwt': 'originaltoken',
                'x-pagopa-lollipop-user-id': 'ABC',
                'test-sensitive-header' : 'test',
            };

            const originalHeader = headers['test-sensitive-header'];
            const masked = maskSensitiveHeaders(headers);

            expect(headers['test-sensitive-header']).to.equal(originalHeader);
            expect(masked['test-sensitive-header']).to.not.equal(originalHeader);
        });
    });

    describe('extractLollipopInfo', () => {
        it('should extract specific Lollipop information', () => {
            const headers = {
                'x-pagopa-lollipop-user-id': 'RSSMRA80A01H501U',
                'x-pagopa-lollipop-assertion-type': 'SAML',
                'x-pagopa-lollipop-original-method': 'POST',
                'x-pagopa-lollipop-original-url': 'https://api.example.com/resource',
                'x-pagopa-lollipop-auth-jwt': 'token'
            };

            const info = extractLollipopInfo(headers);

            expect(info).to.have.property('userId', 'RSSMRA80A01H501U');
            expect(info).to.have.property('assertionType', 'SAML');
            expect(info).to.have.property('originalMethod', 'POST');
            expect(info).to.have.property('originalUrl', 'https://api.example.com/resource');
            expect(info).to.not.have.property('authJwt');
        });

        it('should handle partial information', () => {
            const headers = {
                'x-pagopa-lollipop-user-id': 'TEST123'
            };

            const info = extractLollipopInfo(headers);

            expect(info).to.have.property('userId', 'TEST123');
            expect(info).to.not.have.property('assertionType');
            expect(info).to.not.have.property('originalMethod');
        });

        it('should return empty object if no relevant headers', () => {
            const headers = {
                'x-pagopa-lollipop-auth-jwt': 'token',
                'signature': 'sig'
            };

            const info = extractLollipopInfo(headers);

            expect(info).to.be.an('object');
            expect(Object.keys(info)).to.have.lengthOf(0);
        });
    });
});
