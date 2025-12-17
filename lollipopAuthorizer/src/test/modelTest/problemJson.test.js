const { expect } = require('chai');
const ProblemJson = require('../../app/openapiImpl/getAssertion/model/ProblemJson');

describe('ProblemJson', () => {

  describe('constructor', () => {
    it('should initialize with default type', () => {
      const instance = new ProblemJson();
      expect(instance.type).to.equal('about:blank');
      expect(instance.title).to.be.undefined;
      expect(instance.status).to.be.undefined;
      expect(instance.detail).to.be.undefined;
      expect(instance.instance).to.be.undefined;
    });
  });

  describe('constructFromObject', () => {
    it('should construct a new instance from plain object', () => {
      const data = {
        type: 'https://example.com/error',
        title: 'Error title',
        status: 500,
        detail: 'Something went wrong',
        instance: '/abc/123'
      };
      const instance = ProblemJson.constructFromObject(data);
      expect(instance.type).to.equal(data.type);
      expect(instance.title).to.equal(data.title);
      expect(instance.status).to.equal(data.status);
      expect(instance.detail).to.equal(data.detail);
      expect(instance.instance).to.equal(data.instance);
    });

    it('should not override properties if object already provided', () => {
      const existing = new ProblemJson();
      existing.title = 'Existing title';
      const data = { title: 'New title', status: 400 };
      const result = ProblemJson.constructFromObject(data, existing);
      expect(result).to.equal(existing);
      expect(result.title).to.equal('New title');
      expect(result.status).to.equal(400);
    });
  });

  describe('validateJSON', () => {
    it('should validate correct data', () => {
      const validData = {
        type: 'about:blank',
        title: 'Title',
        detail: 'Detail',
        instance: '/xyz'
      };
      expect(ProblemJson.validateJSON(validData)).to.be.true;
    });

    it('should throw error for non-string type fields', () => {
      const invalidData = { type: 123 };
      expect(() => ProblemJson.validateJSON(invalidData)).to.throw('Expected the field `type` to be a primitive type');
    });

    it('should throw error for non-string title', () => {
      const invalidData = { title: 456 };
      expect(() => ProblemJson.validateJSON(invalidData)).to.throw('Expected the field `title` to be a primitive type');
    });

    it('should throw error for non-string detail', () => {
      const invalidData = { detail: {} };
      expect(() => ProblemJson.validateJSON(invalidData)).to.throw('Expected the field `detail` to be a primitive type');
    });

    it('should throw error for non-string instance', () => {
      const invalidData = { instance: [] };
      expect(() => ProblemJson.validateJSON(invalidData)).to.throw('Expected the field `instance` to be a primitive type');
    });
  });

});
