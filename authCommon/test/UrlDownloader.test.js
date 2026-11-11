const rewire = require('rewire');
const { expect } = require("chai");
const fs = require('fs');
const { AxiosError } = require('axios');
const Downloader = rewire("../app/modules/http/UrlDownloader");


process.env.JWKS_CONTENT_LIMIT_BYTES = '51200';
process.env.JWKS_FOLLOW_REDIRECT = 'true';

const getFilaAsByteArray = (fileName) => {
    return Buffer.from(fs.readFileSync(fileName, 'binary'));
}

describe('Url Downloader Testing', () => {

    for (const code of ['ECONNREFUSED', 'ETIMEDOUT', 'ECONNABORTED', 'ENOTFOUND']) {
        it('preserves the Axios cause and code for ' + code, async () => {
            const downloader = rewire('../app/modules/http/UrlDownloader');
            const original = new AxiosError('connect ' + code, code);
            downloader.__set__('axios', { get: async () => { throw original; } });
            downloader.__set__('console', { warn: () => {} });
            let caught;
            try {
                await downloader.downloadUrl('https://issuer-a/jwks');
            } catch (error) {
                caught = error;
            }
            expect(caught).to.be.instanceOf(Error);
            expect(caught.message).to.equal('Error downloading URL: https://issuer-a/jwks, message: connect ' + code);
            expect(caught.cause).to.equal(original);
            expect(caught.cause.code).to.equal(code);
            expect(caught.cause.isAxiosError).to.equal(true);
        });
    }

    it('preserves an Axios network error whose name is Error', async () => {
        const downloader = rewire('../app/modules/http/UrlDownloader');
        const original = AxiosError.from(Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }));
        downloader.__set__('axios', { get: async () => { throw original; } });
        downloader.__set__('console', { warn: () => {} });
        let caught;
        try {
            await downloader.downloadUrl('https://issuer-a/jwks');
        } catch (error) {
            caught = error;
        }
        expect(original.name).to.equal('Error');
        expect(caught.cause).to.equal(original);
        expect(caught.cause.code).to.equal('ECONNREFUSED');
    });

    it('preserves HTTP error messages and the original response cause', async () => {
        const downloader = rewire('../app/modules/http/UrlDownloader');
        const original = new AxiosError('HTTP failure', 'ERR_BAD_RESPONSE', {}, {}, { status: 503, statusText: 'Unavailable' });
        downloader.__set__('axios', { get: async () => { throw original; } });
        downloader.__set__('console', { warn: () => {} });
        let caught;
        try {
            await downloader.downloadUrl('https://issuer-a/jwks');
        } catch (error) {
            caught = error;
        }
        expect(caught.message).to.equal('Error downloading URL: https://issuer-a/jwks, status: 503, statusText: Unavailable');
        expect(caught.cause).to.equal(original);
    });

    it('should download url', async () => {
        const response = getFilaAsByteArray('test/resources/jwks.json')
        const axiosMock = {
            get: (url, config) => {
                return Promise.resolve({ data: response });
            }
        }
        Downloader.__set__('axios', axiosMock);

        const result = await Downloader.downloadUrl('https://interop.pagopa.it/.well-known.json');
        expect(result).to.deep.equal(response);
    })

    it('should raise an exception if the protocol is not supported', async () => {
        const response = getFilaAsByteArray('test/resources/jwks.json')

        const axiosMock = {
            get: (url, config) => {
                return Promise.resolve({ data: response });
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

    it('should download from s3', async () => {
        const url = 's3://bucket-name/key-name';
        const response = getFilaAsByteArray('test/resources/jwks.json')
        
        const getObjectAsByteArrayStub = () => {
            return response;
        };
        Downloader.__set__('getObjectAsByteArray', getObjectAsByteArrayStub);

        const result = await Downloader.downloadUrl(url);
        expect(result).to.eql(response);
    })


    it('should throw an error if s3 download fails', async () => {
        const url = 's3://bucket-name/key-name';
        const response = getFilaAsByteArray('test/resources/jwks.json')
        try {
            await Downloader.downloadUrl(url);
        } catch (err) {
            expect(err.message).to.equal('Error downloading S3 object from URL: ' + url);
        }
    })
});