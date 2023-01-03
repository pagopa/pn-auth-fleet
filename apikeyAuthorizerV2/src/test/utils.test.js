const { expect, assert } = require("chai");
const utils = require("../app/utils");

describe("Test anonymize function", () => {
    it("anonymize with length > 6", () => {
        let text = "test-clear";
        let anonymized = utils.anonymizeKey(text);
        expect(anonymized).equals("te******ar");
    });

    it("anonymize with length < 6", () => {
        let text = "test";
        let anonymized = utils.anonymizeKey(text);
        expect(anonymized).equals("****");
    });
})



describe('Test anonymizeEvent', () => {
    it("anonymize when apikey is provided", () => {
        let mockedEvent = {
            headers: {
                "x-api-key": "datatohide"
            },
            multiValueHeaders: {
                "x-api-key": ["firstapitohide", "secondapitohide"]
            }
        }
    
        let anonymizedEvent = utils.anonymizeEvent(mockedEvent);
        let expectedEvent = {
            headers: {
                "x-api-key": "da******de"
            },
            multiValueHeaders: {
                "x-api-key": ["fi**********de", "se***********de"]
            }
        };
        assert.deepEqual(anonymizedEvent, expectedEvent);
        
    })

    it("anonymize when apikey is not provided", () => {
        let mockedEvent = {
            headers: {
                "x-api-key": ""
            },
            multiValueHeaders: {
                "x-api-key": []
            }
        }
    
        let anonymizedEvent = utils.anonymizeEvent(mockedEvent);
        let expectedEvent = {
            headers: {
                "x-api-key": ""
            },
            multiValueHeaders: {
                "x-api-key": []
            }
        };
        assert.deepEqual(anonymizedEvent, expectedEvent);
        
    })
})
