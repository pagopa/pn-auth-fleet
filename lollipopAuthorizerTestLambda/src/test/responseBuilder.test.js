const { expect } = require('chai');
const {
    buildSuccessResponse,
    buildErrorResponse,
    buildUnauthorizedResponse,
    buildBadRequestResponse
} = require('../app/responseBuilder');

describe('ResponseBuilder Tests', () => {

    describe('buildSuccessResponse', () => {
        it('should build valid Lambda Proxy response', () => {
            const data = { test: 'value', nested: { key: 'val' } };
            const response = buildSuccessResponse(data);

            expect(response).to.have.property('statusCode', 200);
            expect(response).to.have.property('headers');
            expect(response.headers).to.have.property('Content-Type', 'application/json');
            expect(response.headers).to.have.property('Access-Control-Allow-Origin', '*');
            expect(response).to.have.property('body');

            // Body DEVE essere stringa
            expect(response.body).to.be.a('string');
        });

        it('should have parseable JSON body', () => {
            const data = { foo: 'bar' };
            const response = buildSuccessResponse(data);

            const parsed = JSON.parse(response.body);
            expect(parsed).to.have.property('success', true);
            expect(parsed).to.have.property('timestamp');
            expect(parsed).to.have.property('data');
            expect(parsed.data).to.deep.equal(data);
        });

        it('should include timestamp in ISO format', () => {
            const response = buildSuccessResponse({});
            const body = JSON.parse(response.body);

            expect(body.timestamp).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        });
    });

    describe('buildErrorResponse', () => {
        it('should build error response with custom status code', () => {
            const errorMsg = 'Test error message';
            const response = buildErrorResponse(errorMsg, 400);

            expect(response).to.have.property('statusCode', 400);
            expect(response).to.have.property('headers');
            expect(response).to.have.property('body');
            expect(response.body).to.be.a('string');

            const parsed = JSON.parse(response.body);
            expect(parsed).to.have.property('success', false);
            expect(parsed).to.have.property('error');
            expect(parsed.error).to.have.property('message', errorMsg);
            expect(parsed.error).to.have.property('statusCode', 400);
        });

        it('should default to 500 if status code not provided', () => {
            const response = buildErrorResponse('Error');
            expect(response).to.have.property('statusCode', 500);

            const body = JSON.parse(response.body);
            expect(body.error.statusCode).to.equal(500);
        });

        it('should handle empty error message', () => {
            const response = buildErrorResponse('');
            const body = JSON.parse(response.body);

            expect(body.error.message).to.equal('');
        });
    });

    describe('buildUnauthorizedResponse', () => {
        it('should return 401 status code', () => {
            const response = buildUnauthorizedResponse();
            expect(response).to.have.property('statusCode', 401);
        });

        it('should use custom message if provided', () => {
            const customMsg = 'Custom unauthorized message';
            const response = buildUnauthorizedResponse(customMsg);
            const body = JSON.parse(response.body);

            expect(body.error.message).to.equal(customMsg);
        });

        it('should have default message', () => {
            const response = buildUnauthorizedResponse();
            const body = JSON.parse(response.body);

            expect(body.error.message).to.equal('Unauthorized');
        });
    });

    describe('buildBadRequestResponse', () => {
        it('should return 400 status code', () => {
            const response = buildBadRequestResponse();
            expect(response).to.have.property('statusCode', 400);
        });

        it('should use custom message if provided', () => {
            const customMsg = 'Invalid request parameters';
            const response = buildBadRequestResponse(customMsg);
            const body = JSON.parse(response.body);

            expect(body.error.message).to.equal(customMsg);
        });
    });

    describe('Response Headers', () => {
        it('should include CORS headers in success response', () => {
            const response = buildSuccessResponse({});

            expect(response.headers).to.have.property('Access-Control-Allow-Origin', '*');
        });

        it('should include CORS headers in error response', () => {
            const response = buildErrorResponse('error');

            expect(response.headers).to.have.property('Access-Control-Allow-Origin', '*');
        });

        it('should include X-Lambda-Name header', () => {
            const response = buildSuccessResponse({});

            expect(response.headers).to.have.property('X-Lambda-Name', 'lollipop-dummy-service');
        });
    });

    describe('Body Format Validation', () => {
        it('success response body should be valid JSON string', () => {
            const response = buildSuccessResponse({ key: 'value' });

            expect(() => JSON.parse(response.body)).to.not.throw();
        });

        it('error response body should be valid JSON string', () => {
            const response = buildErrorResponse('error');

            expect(() => JSON.parse(response.body)).to.not.throw();
        });

        it('should not return body as object', () => {
            const response = buildSuccessResponse({});

            expect(response.body).to.not.be.an('object');
            expect(response.body).to.be.a('string');
        });
    });
});

