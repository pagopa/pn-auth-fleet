const { expect } = require("chai");
const utils = require("../app/utils");
const sinon = require("sinon");

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

describe('Test logEvent', () => {
    it("", () => {
        let spy = sinon.spy(console, 'info');
        let mockedEvent = {
            path: "/request",
            httpMethod: "GET",
            headers: {
                "x-api-key": "datatohide",
		        "X-Amzn-Trace-Id": "test"
            }
        }
    
        utils.logEvent(mockedEvent);

        let = expectedEvent = {
            "httpMethod": "GET",
            "path": "/request",
            "X-Amzn-Trace-Id": "test",
            "x-api-key": "da******de"
        };

        expect(spy.getCall(0).calledWith("New event received", sinon.match(expectedEvent))).to.be.true;
        spy.restore();
    })
})
