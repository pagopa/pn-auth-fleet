const { expect } = require("chai");
const { parseTagFromOpenAPIYAML } = require('../app/yamlUtils.js');

describe("Test yaml utils", () => {
    it("empty array in case of undefined", () => {
        const yamlDocument = {
          'paths': {
            'a': {
              'post': {}
            }
          }
        }
        const event = {
          path: 'a',
          httpMethod: 'POST'
        }

        let ret = parseTagFromOpenAPIYAML(yamlDocument, event);
        expect(ret).to.deep.equal([])
    });

    it("filled array", () => {
      const yamlDocument = {
        'paths': {
          'a': {
            'post': {
              'tags': ['a', 'b', 'c']
            }
          }
        }
      }
      const event = {
        path: 'a',
        httpMethod: 'POST'
      }

      let ret = parseTagFromOpenAPIYAML(yamlDocument, event);
      expect(ret).to.deep.equal(['a', 'b', 'c'])
    });

})

