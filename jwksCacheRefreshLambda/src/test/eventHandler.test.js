const { expect } = require("chai");
const issuer = require('./resources/issuerConfig.json')

const rewire = require('rewire');
const eventHandlerModule = rewire("../app/eventHandler.js");

describe('EventHandler Testing', () => {
    it('Should complete without errors', async () => {
        const event = ''
        let callCount = 0;
        // Mock per AllowedIssuerDao e UrlDownloader
        const allowedIssuerDaoMock = {
            listJwksCacheExpiringAtMinute: async () => {
                if(callCount != 1) {
                    callCount++;
                    var res = []
                    res.push(issuer)
                    return res
                }
                else {
                    return []
                }
            },
            addJwksCacheEntry: async () => {}
        };
        const UrlDownloaderMock = {
            downloadUrl: async () => {}
        };

        eventHandlerModule.__set__('AllowedIssuerDao', allowedIssuerDaoMock);
        eventHandlerModule.__set__('UrlDownloader', UrlDownloaderMock);
        const res = await eventHandlerModule.handleEvent(event)
        expect(res).to.not.be.null;
        expect(res).to.not.be.undefined;
        expect(res.statusCode).to.equal(200);
    });

    it('Should complete without errors simulating postpone', async () => {
            const event = ''
            let callCount = 0;

            // Mock per AllowedIssuerDao e UrlDownloader
            const allowedIssuerDaoMock = {
                listJwksCacheExpiringAtMinute: async () => {
                    if(callCount != 1) {
                        callCount++;
                        var res = []
                        res.push(issuer)
                        return res
                    }
                    else {
                        return []
                    }
                },
                addJwksCacheEntry: async () => {
                    throw new Error("Simulated error in addJwksCacheEntry");
                },
                postponeJwksCacheEntryValidation: async () => {}
            };
            const UrlDownloaderMock = {
                downloadUrl: async () => {}
            };

            eventHandlerModule.__set__('AllowedIssuerDao', allowedIssuerDaoMock);
            eventHandlerModule.__set__('UrlDownloader', UrlDownloaderMock);
            process.env.JWKS_REFRESH_INTERVAL_MINUTES = '5';
            const res = await eventHandlerModule.handleEvent(event)
            expect(res).to.not.be.null;
            expect(res).to.not.be.undefined;
            expect(res.statusCode).to.equal(200);
        });
});
