// full tests of Logger

// Path: b2bAuthorizer/src/test/Logger.test.js

const { expect } = require('chai');
const Logger = require('../app/modules/logger');
const logger = new Logger();
const sinon = require('sinon');

describe('Logger', () => {

    it('should add to context and log', () => {
        logger.addToContext('key', 'value');

        consoleLogStub = sinon.stub(console, 'log');

        logger.log('message');

        expect( consoleLogStub.calledWith('message', { key: 'value'}) ).to.be.true;

        consoleLogStub.restore();
    });

    
    it('should add to context and warn', () => {
        logger.addToContext('key', 'value');

        consoleWarnStub = sinon.stub(console, 'warn');

        logger.warn('message');

        expect( consoleWarnStub.calledWith('message', { key: 'value'}) ).to.be.true;

        consoleWarnStub.restore();
    });

    it('should add to context and error', () => {
        logger.addToContext('key', 'value');

        consoleErrorStub = sinon.stub(console, 'error');

        logger.error('message');

        expect( consoleErrorStub.calledWith('message', { key: 'value'}) ).to.be.true;

        consoleErrorStub.restore();
    });

    it('should remove from context and error', () => {
        logger.addToContext('key', 'value');

        consoleErrorStub = sinon.stub(console, 'error');

        logger.error('message');

        expect( consoleErrorStub.calledWith('message', { key: 'value'}) ).to.be.true;

        logger.removeFromContext('key');

        logger.error('message');

        expect( consoleErrorStub.calledWith('message', {}) ).to.be.true;

        consoleErrorStub.restore();
    });

    it('should clear context and error', () => {
        logger.addToContext('key', 'value');
        logger.addToContext('key1', 'value1');

        consoleErrorStub = sinon.stub(console, 'error');

        logger.error('message');

        expect( consoleErrorStub.calledWith('message', { key: 'value', key1: 'value1'}) ).to.be.true;

        logger.clearContext();

        logger.error('message');

        expect( consoleErrorStub.calledWith('message', {}) ).to.be.true;
        
        consoleErrorStub.restore();
    });

    it('should merge context and error', () => {
        logger.addToContext('key', 'value');
        logger.addToContext('key1', 'value1');

        consoleErrorStub = sinon.stub(console, 'error');

        logger.error('message', {
            meta1: 'meta1',
            meta2: 'meta2'
        });

        expect( consoleErrorStub.calledWith('message', {
            key: 'value',
            key1: 'value1',
            meta1: 'meta1',
            meta2: 'meta2'
        }) ).to.be.true;
        
        consoleErrorStub.restore();
    });
});
