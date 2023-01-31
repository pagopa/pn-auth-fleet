const { expect } = require("chai");
const sinon = require('sinon');

const proxyquire = require("proxyquire").noPreserveCache();

describe("Test auth policy", () => {

    it("allow method", async () => {
        const event = {
            methodArn: 'arn:aws:execute-api:eu-south-1:558518206506:0y0p7mcx54/unique/POST/aggregate',
            authorizationToken: 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY1MTc0NzY0NiwiZXhwIjoyNjUxNzUxMjQ2LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMkE2VjBCMTNCSE5DUEVaMzJTN0tRM1kifQ.jY8_5kYQuSERHPmhWaCDoc77KtrPP5p-g7_-2j8wLFwinVX6lnHG2IQi-Gll7S6o8WYqFED2yPydTlNMvtXgARVDMmZNDCzUPeSCMnhDb0UAy2TMxq89Avrl0ydd_KLHcjCw5WvyhBwCIAprakZXSza51Nk2WiBTJ1d-1_zWNg8NDTp7-hBbK90dgnU-w4HET8zp4f1Fnwos84JMbmAeu6wJuGuCn-h1znQer1BCr_tyl_YXQxwyMBYpKQVXLEsHHbmWJzyA8mETMigHNLFw4Y0C9vpjqiEuw2gFCnuSc-4A8WzlI4TuKsfyeCb3gpLDuqiSWvV-aQuu3iJTZ-_l2Q"',
            httpMethod: 'POST'
        }
        
        const eventHandler = proxyquire.noCallThru().load("../app/eventHandler.js", {
            "./s3Utils.js": {
                getAllowedResourcesFromS3 : async () => {
                    return new Promise(res => res([
                        {
                            path: '/test',
                            method: 'POST'
                        }
                    ]))
                }
            },
            "./apiGatewayUtils.js": {
                getOpenAPIS3Location : async () => {
                    return new Promise(res => res([
                        'bucket', 'key', 'api-key-bo'
                    ]))
                }
            },
            "./cognitoUtils.js": {
                getCognitoUserTags : () => {
                    return [
                        'Aggregate'
                    ]
                },
                verifyIdToken : async() => {
                    return new Promise(res => res(true))
                }
            },
        });

        const authResponse = await eventHandler.handleEvent(event);
        console.log(JSON.stringify(authResponse.policyDocument));
        expect(authResponse.policyDocument.Statement[0].Effect).equals('Allow');
    });

    it("multiple level path", async () => {
        const event = {
            methodArn: 'arn:aws:execute-api:eu-south-1:558518206506:0y0p7mcx54/unique/POST/v1/aggregate',
            authorizationToken: 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY1MTc0NzY0NiwiZXhwIjoyNjUxNzUxMjQ2LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMkE2VjBCMTNCSE5DUEVaMzJTN0tRM1kifQ.jY8_5kYQuSERHPmhWaCDoc77KtrPP5p-g7_-2j8wLFwinVX6lnHG2IQi-Gll7S6o8WYqFED2yPydTlNMvtXgARVDMmZNDCzUPeSCMnhDb0UAy2TMxq89Avrl0ydd_KLHcjCw5WvyhBwCIAprakZXSza51Nk2WiBTJ1d-1_zWNg8NDTp7-hBbK90dgnU-w4HET8zp4f1Fnwos84JMbmAeu6wJuGuCn-h1znQer1BCr_tyl_YXQxwyMBYpKQVXLEsHHbmWJzyA8mETMigHNLFw4Y0C9vpjqiEuw2gFCnuSc-4A8WzlI4TuKsfyeCb3gpLDuqiSWvV-aQuu3iJTZ-_l2Q"',
            httpMethod: 'POST'
        }
        
        const eventHandler = proxyquire.noCallThru().load("../app/eventHandler.js", {
            "./s3Utils.js": {
                getAllowedResourcesFromS3 : async () => {
                    return new Promise(res => res([
                        {
                            path: '/test',
                            method: 'POST'
                        },
                        {
                            path: '/test/*',
                            method: 'GET'
                        }
                    ]))
                }
            },
            "./apiGatewayUtils.js": {
                getOpenAPIS3Location : async () => {
                    return new Promise(res => res([
                        'bucket', 'key', 'api-key-bo'
                    ]))
                }
            },
            "./cognitoUtils.js": {
                getCognitoUserTags : () => {
                    return [
                        'Aggregate'
                    ]
                },
                verifyIdToken : async() => {
                    return new Promise(res => res({
                        
                    }))
                }
            },
        });

        const authResponse = await eventHandler.handleEvent(event);
        console.log(authResponse.policyDocument)
        expect(authResponse.policyDocument.Statement[0].Effect).equals('Allow');
    });

    it("invalid token", async () => {
        const event = {
            methodArn: 'arn:aws:execute-api:eu-south-1:558518206506:0y0p7mcx54/unique/POST/aggregate',
            authorizationToken: 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY1MTc0NzY0NiwiZXhwIjoyNjUxNzUxMjQ2LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMkE2VjBCMTNCSE5DUEVaMzJTN0tRM1kifQ.jY8_5kYQuSERHPmhWaCDoc77KtrPP5p-g7_-2j8wLFwinVX6lnHG2IQi-Gll7S6o8WYqFED2yPydTlNMvtXgARVDMmZNDCzUPeSCMnhDb0UAy2TMxq89Avrl0ydd_KLHcjCw5WvyhBwCIAprakZXSza51Nk2WiBTJ1d-1_zWNg8NDTp7-hBbK90dgnU-w4HET8zp4f1Fnwos84JMbmAeu6wJuGuCn-h1znQer1BCr_tyl_YXQxwyMBYpKQVXLEsHHbmWJzyA8mETMigHNLFw4Y0C9vpjqiEuw2gFCnuSc-4A8WzlI4TuKsfyeCb3gpLDuqiSWvV-aQuu3iJTZ-_l2Q"',
            httpMethod: 'POST'
        }
        
        const eventHandler = proxyquire.noCallThru().load("../app/eventHandler.js", {
            "./s3Utils.js": {
                getAllowedResourcesFromS3 : async () => {
                    return new Promise(res => res({
                        method: 'POST',
                        path: '/test'
                    }))
                }
            },
            "./apiGatewayUtils.js": {
                getOpenAPIS3Location : async () => {
                    return new Promise(res => res([
                        'bucket', 'key', 'api-key-bo'
                    ]))
                }
            },
            "./cognitoUtils.js": {
                getCognitoUserTags : () => {
                    return [
                        'Aggregate'
                    ]
                },
                verifyIdToken : async() => {
                    return new Promise(res => res(false))
                }
            },
        });

        const authResponse = await eventHandler.handleEvent(event);
        console.log(authResponse.policyDocument)
        expect(authResponse.policyDocument.Statement[0].Effect).equals('Deny');
    });

    it("invalid bearer token", async () => {
        const event = {
            methodArn: 'arn:aws:execute-api:eu-south-1:558518206506:0y0p7mcx54/unique/POST/aggregate',
            authorizationToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY1MTc0NzY0NiwiZXhwIjoyNjUxNzUxMjQ2LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMkE2VjBCMTNCSE5DUEVaMzJTN0tRM1kifQ.jY8_5kYQuSERHPmhWaCDoc77KtrPP5p-g7_-2j8wLFwinVX6lnHG2IQi-Gll7S6o8WYqFED2yPydTlNMvtXgARVDMmZNDCzUPeSCMnhDb0UAy2TMxq89Avrl0ydd_KLHcjCw5WvyhBwCIAprakZXSza51Nk2WiBTJ1d-1_zWNg8NDTp7-hBbK90dgnU-w4HET8zp4f1Fnwos84JMbmAeu6wJuGuCn-h1znQer1BCr_tyl_YXQxwyMBYpKQVXLEsHHbmWJzyA8mETMigHNLFw4Y0C9vpjqiEuw2gFCnuSc-4A8WzlI4TuKsfyeCb3gpLDuqiSWvV-aQuu3iJTZ-_l2Q"',
            httpMethod: 'POST'
        }
        
        const eventHandler = proxyquire.noCallThru().load("../app/eventHandler.js", {
            "./s3Utils.js": {
                getAllowedResourcesFromS3 : async () => {
                    return new Promise(res => res([
                        {
                            method: 'POST',
                            path: '/test'
                        }
                    ]))
                }
            },
            "./apiGatewayUtils.js": {
                getOpenAPIS3Location : async () => {
                    return new Promise(res => res([
                        'bucket', 'key', 'api-key-bo'
                    ]))
                }
            },
            "./cognitoUtils.js": {
                getCognitoUserTags : () => {
                    return [
                        'Aggregate'
                    ]
                },
                verifyIdToken : async() => {
                    return new Promise(res => res(false))
                }
            },
        });

        const authResponse = await eventHandler.handleEvent(event);
        expect(authResponse.policyDocument.Statement[0].Effect).equals('Deny');
    });

    it("deny on exception", async () => {
        const event = {
            methodArn: 'arn:aws:execute-api:eu-south-1:558518206506:0y0p7mcx54/unique/POST/aggregate',
            authorizationToken: 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY1MTc0NzY0NiwiZXhwIjoyNjUxNzUxMjQ2LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMkE2VjBCMTNCSE5DUEVaMzJTN0tRM1kifQ.jY8_5kYQuSERHPmhWaCDoc77KtrPP5p-g7_-2j8wLFwinVX6lnHG2IQi-Gll7S6o8WYqFED2yPydTlNMvtXgARVDMmZNDCzUPeSCMnhDb0UAy2TMxq89Avrl0ydd_KLHcjCw5WvyhBwCIAprakZXSza51Nk2WiBTJ1d-1_zWNg8NDTp7-hBbK90dgnU-w4HET8zp4f1Fnwos84JMbmAeu6wJuGuCn-h1znQer1BCr_tyl_YXQxwyMBYpKQVXLEsHHbmWJzyA8mETMigHNLFw4Y0C9vpjqiEuw2gFCnuSc-4A8WzlI4TuKsfyeCb3gpLDuqiSWvV-aQuu3iJTZ-_l2Q"',
            httpMethod: 'POST'
        }
        
        const eventHandler = proxyquire.noCallThru().load("../app/eventHandler.js", {
            "./s3Utils.js": {
                getAllowedResourcesFromS3 : async () => {
                    return new Promise(res => res([
                        {
                            method: 'POST',
                            path: '/test'
                        }
                    ]))
                }
            },
            "./apiGatewayUtils.js": {
                getOpenAPIS3Location : async () => {
                    return new Promise(res => res([
                        'bucket', 'key', 'api-key-bo'
                    ]))
                }
            },
            "./cognitoUtils.js": {
                getCognitoUserTags : () => {
                    return [
                        'Aggregate'
                    ]
                },
                verifyIdToken : async() => {
                    throw new Error('Invalid token')
                }
            },
        });

        const authResponse = await eventHandler.handleEvent(event);
        console.log(authResponse.policyDocument)
        expect(authResponse.policyDocument.Statement[0].Effect).equals('Deny');
    });
})

