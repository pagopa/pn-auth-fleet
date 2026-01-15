import { expect  } from "chai";
import AssertionRef from "../../app/openapiImpl/getAssertion/model/AssertionRef.js";

describe('AssertionRef', () => {

  describe('constructor', () => {
    it('should create instance for valid sha256 string', () => {
      const ref = new AssertionRef('sha256-abcdef1234567890');
      expect(ref.getActualInstance()).to.equal('sha256-abcdef1234567890');
    });

    it('should create instance for valid sha384 string', () => {
      const ref = new AssertionRef('sha384-abcdef1234567890');
      expect(ref.getActualInstance()).to.equal('sha384-abcdef1234567890');
    });

    it('should create instance for valid sha512 string', () => {
      const ref = new AssertionRef('sha512-abcdef1234567890');
      expect(ref.getActualInstance()).to.equal('sha512-abcdef1234567890');
    });

    it('should throw error for invalid string format', () => {
        expect(() => new AssertionRef('invalid-string')).to.throw(Error)
        .with.property('message')
        .that.includes('No match found constructing `AssertionRef`');
      });

    it('should allow null input and set actualInstance to null', () => {
      const ref = new AssertionRef(null);
      expect(ref.getActualInstance()).to.be.null;
    });
  });

  describe('constructFromObject', () => {
    it('should construct an instance from string', () => {
      const ref = AssertionRef.constructFromObject('sha256-abcdef123');
      expect(ref.getActualInstance()).to.equal('sha256-abcdef123');
    });
  });

  describe('get/setActualInstance', () => {
    it('should get and set actual instance', () => {
      const ref = new AssertionRef('sha256-abcdef123');
      expect(ref.getActualInstance()).to.equal('sha256-abcdef123');

      ref.setActualInstance('sha384-12345');
      expect(ref.getActualInstance()).to.equal('sha384-12345');
    });
  });

  describe('toJSON and fromJSON', () => {
    it('should serialize to JSON', () => {
      const ref = new AssertionRef('sha256-xyz');
      expect(ref.toJSON()).to.equal('sha256-xyz');
    });

    it('should create instance from JSON string', () => {
      const ref = AssertionRef.fromJSON('"sha512-xyz"');
      expect(ref.getActualInstance()).to.equal('sha512-xyz');
    });
  });
});
