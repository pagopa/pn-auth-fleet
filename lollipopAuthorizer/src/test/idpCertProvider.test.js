import { expect } from 'chai';
import esmock from 'esmock';

const MODULE_PATH = '../app/openapiImpl/idp/idpCertProvider.js';
const API_CLIENT_PATH = '../app/openapiImpl/idp/ApiClient.js';
const IDP_CERT_CLIENT_PATH = '../app/openapiImpl/idp/client/idpCertClient.js';

describe('idpCertProvider', () => {
    let idpCertProvider;
    let capturedApiClientInstance;

    before(async () => {
        function MockApiClient(basePath) {
            this.timeout = 60000; // simula il default del costruttore reale
            capturedApiClientInstance = this;
        }

        function MockIdpCertClient(apiClient) {
            this.getListCertData = async () => [];
        }

        ({ default: idpCertProvider } = await esmock(MODULE_PATH, {
            [API_CLIENT_PATH]: { default: MockApiClient },
            [IDP_CERT_CLIENT_PATH]: { default: MockIdpCertClient },
        }));
    });

    afterEach(() => {
        delete process.env.IDP_HTTP_TIMEOUT_MS;
        capturedApiClientInstance = null;
    });

    describe('provideClient() - configurazione timeout', () => {

        it('applica il timeout di default (10000ms) quando IDP_HTTP_TIMEOUT_MS non è definita', async () => {
            delete process.env.IDP_HTTP_TIMEOUT_MS;
            await idpCertProvider.getIdpCertData('1234567890', 'https://some.entity.id');
            expect(capturedApiClientInstance).to.not.be.null;
            expect(capturedApiClientInstance.timeout).to.equal(10000);
        });

        it('applica il timeout configurato via IDP_HTTP_TIMEOUT_MS', async () => {
            process.env.IDP_HTTP_TIMEOUT_MS = '5000';
            await idpCertProvider.getIdpCertData('1234567890', 'https://some.entity.id');
            expect(capturedApiClientInstance.timeout).to.equal(5000);
        });

        it('sovrascrive il default del costruttore ApiClient (60000ms)', async () => {
            delete process.env.IDP_HTTP_TIMEOUT_MS;
            await idpCertProvider.getIdpCertData('1234567890', 'https://some.entity.id');
            expect(capturedApiClientInstance.timeout).to.not.equal(60000);
        });

        it('il timeout è un numero intero anche se IDP_HTTP_TIMEOUT_MS è una stringa', async () => {
            process.env.IDP_HTTP_TIMEOUT_MS = '7500';
            await idpCertProvider.getIdpCertData('1234567890', 'https://some.entity.id');
            expect(capturedApiClientInstance.timeout).to.be.a('number');
            expect(capturedApiClientInstance.timeout).to.equal(7500);
        });

    });

    describe('getIdpCertData()', () => {

        it('restituisce il risultato di getListCertData', async () => {
            const result = await idpCertProvider.getIdpCertData('1234567890', 'https://some.entity.id');
            expect(result).to.deep.equal([]);
        });

    });
});
