const { expect } = require('chai');
const rewire = require('rewire');

describe('Persistent connection retries', () => {
    const now = Date.parse('2026-11-11T16:00:30Z');
    let records, failures, updates, transactions, logs, metrics, dao, handler, clock;
    let env;

    function connectionError(code) {
        return Object.assign(new Error('connect ' + code), { isAxiosError: true, code });
    }

    function addIssuer(iss, retryAttempt) {
        const record = {
            iss,
            hashKey: 'ISS~' + iss,
            sortKey: 'CFG',
            JWKSUrl: 'https://' + iss + '/jwks',
            JWKSCacheRenewSec: 3600,
            JWKSCacheMaxDurationSec: 60000,
            jwksCacheOriginalExpireEpochSeconds: Math.floor(now / 1000)
        };
        if (retryAttempt !== undefined) record.retryAttempt = retryAttempt;
        records.set(record.hashKey, record);
        return record;
    }

    function newInvocation(issuers) {
        let firstQuery = true;
        const module = rewire('../app/eventHandler');
        module.__set__('AllowedIssuerDao', {
            ...dao,
            listJwksCacheExpiringAtMinute: async () => {
                if (!firstQuery) return [];
                firstQuery = false;
                // Deliberately stale GSI values must not determine the log level.
                return issuers.map(iss => ({ ...records.get('ISS~' + iss), retryAttempt: 0 }));
            }
        });
        module.__set__('UrlDownloader', handler.downloader);
        module.__set__('metricsHandler', metrics);
        module.__set__('console', {
            log: () => {},
            warn: (...args) => logs.warn.push(args),
            error: (...args) => logs.error.push(args)
        });
        return module;
    }

    async function invoke(...issuers) {
        const result = await newInvocation(issuers).handleEvent({});
        expect(result.statusCode).to.equal(200);
        expect(JSON.parse(result.body)).to.deep.equal({ message: 'OK' });
    }

    beforeEach(() => {
        records = new Map();
        failures = new Map();
        updates = [];
        transactions = [];
        logs = { warn: [], error: [] };
        metrics = { addMetric: () => {}, publishMetrics: () => {} };
        env = {
            JWKS_REFRESH_INTERVAL_MINUTES: process.env.JWKS_REFRESH_INTERVAL_MINUTES,
            JWKS_DOWNLOAD_RETRY_INTERVAL_MINUTES: process.env.JWKS_DOWNLOAD_RETRY_INTERVAL_MINUTES,
            JWKS_DYNAMO_CACHE_CONTENT_LIMIT: process.env.JWKS_DYNAMO_CACHE_CONTENT_LIMIT
        };
        process.env.JWKS_REFRESH_INTERVAL_MINUTES = '5';
        process.env.JWKS_DOWNLOAD_RETRY_INTERVAL_MINUTES = '2';
        process.env.JWKS_DYNAMO_CACHE_CONTENT_LIMIT = '51200';
        clock = Date.now;
        Date.now = () => now;
        dao = rewire('../../../authCommon/app/modules/dao/AllowedIssuerDao');
        dao.__set__('ddbDocClient', {
            send: async command => {
                const input = command.input;
                switch (command.constructor.name) {
                    case 'GetCommand':
                        return { Item: { ...records.get(input.Key.hashKey) } };
                    case 'UpdateCommand': {
                        updates.push(input);
                        const record = records.get(input.Key.hashKey);
                        record.jwksCacheExpireSlot = input.ExpressionAttributeValues[':jwksCacheExpireSlot'];
                        if (input.UpdateExpression.includes('retryAttempt')) {
                            expect(input.UpdateExpression).to.include('retryAttempt = if_not_exists(retryAttempt, :zero) + :one');
                            record.retryAttempt = (record.retryAttempt ?? input.ExpressionAttributeValues[':zero']) + input.ExpressionAttributeValues[':one'];
                            expect(input.ReturnValues).to.equal('UPDATED_NEW');
                            return { Attributes: { retryAttempt: record.retryAttempt } };
                        }
                        return {};
                    }
                    case 'TransactWriteCommand': {
                        transactions.push(input);
                        const update = input.TransactItems[0].Update;
                        expect(update.UpdateExpression).to.include('retryAttempt = :retryAttempt');
                        records.get(update.Key.hashKey).retryAttempt = update.ExpressionAttributeValues[':retryAttempt'];
                        return {};
                    }
                    default:
                        throw new Error('Unexpected DynamoDB command: ' + command.constructor.name);
                }
            }
        });
        const downloader = rewire('../../../authCommon/app/modules/http/UrlDownloader');
        downloader.__set__('axios', {
            get: async url => {
                const record = [...records.values()].find(record => record.JWKSUrl === url);
                if (!record) throw new Error('Unexpected URL: ' + url);
                if (failures.has(record.iss)) throw failures.get(record.iss);
                return { data: Buffer.from('{}') };
            }
        });
        downloader.__set__('console', { warn: () => {} });
        handler = { downloader };
    });

    afterEach(() => {
        Date.now = clock;
        for (const [key, value] of Object.entries(env)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    });

    for (const codes of [
        ['ECONNREFUSED'],
        ['ETIMEDOUT'],
        ['ECONNREFUSED', 'ETIMEDOUT']
    ]) {
        it('uses WARN for attempts 1-5 and ERROR from 6 across invocations: ' + codes.join('/'), async () => {
            const record = addIssuer('issuer-a');
            for (let attempt = 1; attempt <= 7; attempt++) {
                failures.set('issuer-a', connectionError(codes[(attempt - 1) % codes.length]));
                await invoke('issuer-a');
                expect(record.retryAttempt).to.equal(attempt);
                expect(logs.warn).to.have.lengthOf(Math.min(attempt, 5));
                expect(logs.error).to.have.lengthOf(Math.max(attempt - 5, 0));
                const lastLog = attempt < 6 ? logs.warn[attempt - 1] : logs.error[attempt - 6];
                expect(lastLog[0]).to.include('issuer-a, retryAttempt ' + attempt);
                expect(updates).to.have.lengthOf(attempt);
                expect(record.jwksCacheExpireSlot).to.equal('2026-11-11T16:02Z');
            }
            expect(transactions).to.have.lengthOf(0);
        });
    }

    for (const code of ['ECONNREFUSED', 'ETIMEDOUT']) {
        it('resets after success and restarts at 1 for ' + code, async () => {
            const record = addIssuer('issuer-a', 5);
            failures.set('issuer-a', connectionError(code));
            await invoke('issuer-a');
            expect(record.retryAttempt).to.equal(6);
            failures.delete('issuer-a');
            await invoke('issuer-a');
            expect(record.retryAttempt).to.equal(0);
            expect(transactions).to.have.lengthOf(1);
            failures.set('issuer-a', connectionError(code));
            await invoke('issuer-a');
            expect(record.retryAttempt).to.equal(1);
            expect(logs.warn).to.have.lengthOf(1);
            expect(logs.error).to.have.lengthOf(1);
        });
    }

    it('keeps counters independent when issuers are interleaved', async () => {
        const first = addIssuer('issuer-a', 5);
        const second = addIssuer('issuer-b');
        failures.set('issuer-a', connectionError('ECONNREFUSED'));
        failures.set('issuer-b', connectionError('ETIMEDOUT'));
        await invoke('issuer-a', 'issuer-b');
        expect(first.retryAttempt).to.equal(6);
        expect(second.retryAttempt).to.equal(1);
        expect(logs.error[0][0]).to.include('issuer-a');
        expect(logs.warn[0][0]).to.include('issuer-b');
        failures.delete('issuer-a');
        await invoke('issuer-b', 'issuer-a');
        expect(first.retryAttempt).to.equal(0);
        expect(second.retryAttempt).to.equal(2);
    });

    it('does not reset or increment on an intervening non-selected error', async () => {
        const record = addIssuer('issuer-a');
        failures.set('issuer-a', connectionError('ECONNREFUSED'));
        await invoke('issuer-a');
        failures.set('issuer-a', connectionError('ECONNABORTED'));
        await invoke('issuer-a');
        expect(record.retryAttempt).to.equal(1);
        expect(updates[1].UpdateExpression).not.to.include('retryAttempt');
        failures.set('issuer-a', connectionError('ETIMEDOUT'));
        await invoke('issuer-a');
        expect(record.retryAttempt).to.equal(2);
        expect(logs.warn).to.have.lengthOf(2);
        expect(logs.error).to.have.lengthOf(1);
    });

    for (const error of [
        connectionError('ECONNABORTED'),
        connectionError('ENOTFOUND'),
        connectionError('ERR_BAD_RESPONSE'),
        Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }),
        Object.assign(new Error('connect ETIMEDOUT'), { code: 'ETIMEDOUT' }),
        new Error('Generic failure')
    ]) {
        it('keeps immediate ERROR for non-selected errors: ' + error.message, async () => {
            const record = addIssuer('issuer-a');
            failures.set('issuer-a', error);
            await invoke('issuer-a');
            expect(record).not.to.have.property('retryAttempt');
            expect(logs.error).to.have.lengthOf(1);
            expect(logs.warn).to.have.lengthOf(0);
            expect(updates).to.have.lengthOf(1);
            expect(updates[0].UpdateExpression).not.to.include('retryAttempt');
            expect(record.jwksCacheExpireSlot).to.equal('2026-11-11T16:02Z');
        });
    }

    it('also recognizes an unwrapped Axios error with its own native cause', async () => {
        addIssuer('issuer-a');
        const original = connectionError('ECONNREFUSED');
        original.cause = new Error('Native socket error');
        handler.downloader = { downloadUrl: async () => { throw original; } };
        await invoke('issuer-a');
        expect(logs.warn).to.have.lengthOf(1);
        expect(logs.error).to.have.lengthOf(0);
    });

    it('propagates persistence failures rather than suppressing invocation errors', async () => {
        addIssuer('issuer-a');
        failures.set('issuer-a', connectionError('ECONNREFUSED'));
        const failure = new Error('DynamoDB unavailable');
        dao.postponeJwksCacheEntryValidation = async () => { throw failure; };
        let published = false;
        metrics.publishMetrics = () => { published = true; };
        let caught;
        try {
            await invoke('issuer-a');
        } catch (error) {
            caught = error;
        }
        expect(caught).to.equal(failure);
        expect(published).to.equal(true);
        expect(logs.warn).to.have.lengthOf(0);
    });

    it('rejects a missing persisted counter instead of logging a false WARN', async () => {
        addIssuer('issuer-a');
        failures.set('issuer-a', connectionError('ETIMEDOUT'));
        dao.postponeJwksCacheEntryValidation = async () => ({});
        let caught;
        try {
            await invoke('issuer-a');
        } catch (error) {
            caught = error;
        }
        expect(caught).to.be.instanceOf(Error);
        expect(caught.message).to.equal('Invalid retryAttempt after rescheduling issuer issuer-a');
        expect(logs.warn).to.have.lengthOf(0);
    });
});
