const { expect } = require('chai');
const { handleEvent } = require('../app/eventHandler');

describe('EventHandler Tests', () => {

    describe('handleEvent with valid authorizer context', () => {
        it('should return 200 with complete response', async () => {
            const mockEvent = {
                httpMethod: 'GET',
                path: '/test',
                headers: {
                    'x-pagopa-lollipop-user-id': 'RSSMRA80A01H501U',
                    'x-pagopa-lollipop-auth-jwt': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature',
                    'x-pagopa-lollipop-public-key': 'eyJrdHkiOiJFQyIsIngiOiJ0ZXN0In0',
                    'x-pagopa-lollipop-assertion-type': 'SAML',
                    'signature': 'sig1=:MEUCIQCxtest:',
                    'signature-input': 'sig1=("@method" "@path");created=1234567890',
                    'content-type': 'application/json',
                    'user-agent': 'test-client'
                },
                queryStringParameters: {
                    testParam: 'testValue'
                },
                requestContext: {
                    requestTime: '07/Jan/2026:14:30:00 +0000',
                    authorizer: {
                        userId: 'RSSMRA80A01H501U',
                        name: 'Mario',
                        familyName: 'Rossi',
                        fiscalCode: 'RSSMRA80A01H501U'
                    }
                }
            };

            const response = await handleEvent(mockEvent);

            expect(response).to.have.property('statusCode', 200);
            expect(response).to.have.property('headers');
            expect(response.headers).to.have.property('Content-Type', 'application/json');
            expect(response).to.have.property('body');

            const body = JSON.parse(response.body);
            expect(body).to.have.property('success', true);
            expect(body).to.have.property('timestamp');
            expect(body).to.have.property('data');
            expect(body.data).to.have.property('lollipopHeaders');
            expect(body.data).to.have.property('authorizerContext');
            expect(body.data.authorizerContext).to.deep.equal(mockEvent.requestContext.authorizer);
        });

        it('should extract all Lollipop headers', async () => {
            const mockEvent = {
                httpMethod: 'POST',
                path: '/test',
                headers: {
                    'x-pagopa-lollipop-user-id': 'TEST123',
                    'x-pagopa-lollipop-auth-jwt': 'token',
                    'signature': 'sig',
                    'signature-input': 'input',
                    'content-type': 'application/json'
                },
                requestContext: {
                    requestTime: '07/Jan/2026:14:30:00 +0000'
                }
            };

            const response = await handleEvent(mockEvent);
            const body = JSON.parse(response.body);

            expect(body.data.lollipopHeaders).to.have.property('x-pagopa-lollipop-user-id');
            expect(body.data.lollipopHeaders).to.have.property('x-pagopa-lollipop-auth-jwt');
            expect(body.data.lollipopHeaders).to.have.property('signature');
            expect(body.data.lollipopHeaders).to.have.property('signature-input');
            expect(body.data.lollipopHeaders).to.not.have.property('content-type');
        });

        it('should include request body in response when body is present', async () => {
            const requestBody = { message: 'test from App IO', userId: '123' };
            const mockEvent = {
                httpMethod: 'POST',
                path: '/test',
                headers: {
                    'x-pagopa-lollipop-user-id': 'TEST123',
                    'content-type': 'application/json'
                },
                body: JSON.stringify(requestBody),
                requestContext: {
                    authorizer: {
                        userId: 'TEST123',
                        name: 'Test',
                        familyName: 'User'
                    }
                }
            };

            const response = await handleEvent(mockEvent);
            const body = JSON.parse(response.body);

            expect(body.data).to.have.property('requestBody');
            expect(body.data.requestBody).to.deep.equal(requestBody);
            expect(body.data.summary).to.have.property('body');
            expect(body.data.summary.body).to.equal(JSON.stringify(requestBody));
            expect(body.data.request).to.have.property('hasBody', true);
            expect(body.data.request).to.have.property('bodyLength', JSON.stringify(requestBody).length);
        });

        it('should have bodyLength 0 when no body present', async () => {
            const mockEvent = {
                httpMethod: 'GET',
                path: '/test',
                headers: {
                    'x-pagopa-lollipop-user-id': 'TEST123'
                },
                requestContext: {}
            };

            const response = await handleEvent(mockEvent);
            const body = JSON.parse(response.body);

            expect(body.data).to.not.have.property('requestBody');
            expect(body.data.summary).to.not.have.property('body');
            expect(body.data.request).to.have.property('hasBody', false);
            expect(body.data.request).to.have.property('bodyLength', 0);
        });

        it('should handle non-JSON body as string', async () => {
            const mockEvent = {
                httpMethod: 'POST',
                path: '/test',
                headers: {
                    'content-type': 'text/plain'
                },
                body: 'plain text body',
                requestContext: {}
            };

            const response = await handleEvent(mockEvent);
            const body = JSON.parse(response.body);

            expect(body.data).to.have.property('requestBody', 'plain text body');
            expect(body.data.summary).to.have.property('body', 'plain text body');
            expect(body.data.request).to.have.property('bodyLength', 15);
        });
    });

    describe('handleEvent without authorizer context', () => {
        it('should return 200 with null authorizerContext', async () => {
            const mockEvent = {
                httpMethod: 'GET',
                path: '/test',
                headers: {
                    'x-pagopa-lollipop-user-id': 'RSSMRA80A01H501U'
                },
                requestContext: {
                    requestTime: '07/Jan/2026:14:30:00 +0000'
                }
            };

            const response = await handleEvent(mockEvent);

            expect(response).to.have.property('statusCode', 200);

            const body = JSON.parse(response.body);
            expect(body.data.authorizerContext).to.be.null;
            expect(body.data.summary.hasAuthorizerContext).to.be.false;
        });
    });

    describe('handleEvent with malformed event', () => {
        it('should handle missing headers gracefully', async () => {
            const mockEvent = {
                httpMethod: 'GET',
                path: '/test',
                requestContext: {}
            };

            const response = await handleEvent(mockEvent);

            expect(response).to.have.property('statusCode');
            expect([200, 500]).to.include(response.statusCode);
            expect(response).to.have.property('body');
        });

        it('should handle empty event gracefully', async () => {
            const mockEvent = {};

            const response = await handleEvent(mockEvent);

            expect(response).to.have.property('statusCode');
            expect(response).to.have.property('body');
        });
    });

    describe('handleEvent with query parameters', () => {
        it('should include query parameters in response', async () => {
            const mockEvent = {
                httpMethod: 'GET',
                path: '/test',
                headers: {},
                queryStringParameters: {
                    param1: 'value1',
                    param2: 'value2'
                },
                requestContext: {}
            };

            const response = await handleEvent(mockEvent);
            const body = JSON.parse(response.body);

            expect(body.data.request.queryParameters).to.deep.equal({
                param1: 'value1',
                param2: 'value2'
            });
        });
    });

    describe('handleEvent response structure', () => {
        it('should have correct summary section', async () => {
            const mockEvent = {
                httpMethod: 'GET',
                path: '/test',
                headers: {
                    'x-pagopa-lollipop-user-id': 'TEST',
                    'x-pagopa-lollipop-auth-jwt': 'token',
                    'signature': 'sig',
                    'content-type': 'application/json'
                },
                requestContext: {
                    authorizer: {
                        userId: 'TEST'
                    }
                }
            };

            const response = await handleEvent(mockEvent);
            const body = JSON.parse(response.body);

            expect(body.data.summary).to.have.property('headers');
            expect(body.data.summary).to.have.property('hasAuthorizerContext', true);
            expect(body.data.summary).to.have.property('authorizerContextKeys');
            expect(body.data.summary.authorizerContextKeys).to.include('userId');
        });

        it('should include name and familyName from authorizer context', async () => {
            const mockEvent = {
                httpMethod: 'POST',
                path: '/test',
                headers: {
                    'x-pagopa-lollipop-user-id': 'RSSMRA80A01H501U'
                },
                body: JSON.stringify({ test: 'data' }),
                requestContext: {
                    authorizer: {
                        userId: 'RSSMRA80A01H501U',
                        name: 'Mario',
                        familyName: 'Rossi'
                    }
                }
            };

            const response = await handleEvent(mockEvent);
            const body = JSON.parse(response.body);

            expect(body.data.authorizerContext).to.have.property('name', 'Mario');
            expect(body.data.authorizerContext).to.have.property('familyName', 'Rossi');
            expect(body.data.authorizerContext).to.have.property('userId', 'RSSMRA80A01H501U');

            expect(body.data.summary.authorizerContextKeys).to.include('name');
            expect(body.data.summary.authorizerContextKeys).to.include('familyName');
        });
    });
});