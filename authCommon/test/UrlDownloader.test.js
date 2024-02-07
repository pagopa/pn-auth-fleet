const rewire = require('rewire');
const { expect } = require("chai");
const fs = require('fs');
const { AxiosError } = require('axios');

const Downloader = rewire("../app/modules/http/UrlDownloader");

process.env.JWKS_CONTENT_LIMIT_BYTES = '51200';
process.env.JWKS_FOLLOW_REDIRECT = 'true';

describe('Url Downloader Testing', () => {

    it('should download url', async () => {
        const response = fs.readFileSync('test/resources/jwks.json')
        const axiosMock = {
            get: (url, config) => {
                return Promise.resolve({ data: JSON.parse(response)});
            }
        }
        Downloader.__set__('axios', axiosMock);

        const result = await Downloader.downloadUrl('https://interop.pagopa.it/.well-known.json');
        expect(result).to.deep.equal(JSON.parse(response));
    })

    it('should raise an exception if the protocol is not supported', async () => {
        const response = fs.readFileSync('test/resources/jwks.json')

        const axiosMock = {
            get: (url, config) => {
                return Promise.resolve({ data: JSON.parse(response) });
            }
        }
        Downloader.__set__('axios', axiosMock);

        try {
            await Downloader.downloadUrl('http://interop.pagopa.it/.well-known.json');
        } catch (err) {
            expect(err.message).to.equal('Unsupported protocol: http://interop.pagopa.it/.well-known.json');
        }
    });

    it('should raise an exception if axios get raises an exception', async () => {
        const axiosMock = {
            get: (url, config) => {
                return Promise.reject(new AxiosError('Test error'));
            }
        }
        Downloader.__set__('axios', axiosMock);

        try {
            await Downloader.downloadUrl('https://interop.pagopa.it/.well-known.json');
        } catch (err) {
            expect(err.message).to.equal('Error downloading URL: https://interop.pagopa.it/.well-known.json, message: Test error');
        }
    });

    it('should raise an exception if axios get raises an exception with response', async () => {
        const axiosMock = {
            get: (url, config) => {
                return Promise.reject(new AxiosError('Test error', 400, {}, {}, { status: 400, statusText: 'Bad Request' }));
            }
        }
        Downloader.__set__('axios', axiosMock);

        try {
            await Downloader.downloadUrl('https://interop.pagopa.it/.well-known.json');
        } catch (err) {
            expect(err.message).to.equal('Error downloading URL: https://interop.pagopa.it/.well-known.json, status: 400, statusText: Bad Request');
        }
    });

    it('should raise ContentLengthExceededError exception if the content lenght is exceeded', async () => {
        const axiosMock = {
            get: (url, config) => {
                return Promise.reject(new AxiosError('maxContentLength exceeded'));
            }
        }
        Downloader.__set__('axios', axiosMock);

        try {
            await Downloader.downloadUrl('https://interop.pagopa.it/.well-known.json');
        } catch (err) {
            expect(err.name).equal('ContentLengthExceededError');
        }
    });

    it('should raise ContentLengthExceededError exception if a generic error is thrown by axios', async () => {
        const axiosMock = {
            get: (url, config) => {
                return Promise.reject(new Error('Generic error'));
            }
        }
        Downloader.__set__('axios', axiosMock);

        try {
            await Downloader.downloadUrl('https://interop.pagopa.it/.well-known.json');
        } catch (err) {
            expect(err.message).to.equal('Generic error');
        }
    });

});