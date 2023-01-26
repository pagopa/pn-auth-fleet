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
          openApiPath: 'a',
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
        openApiPath: 'a',        
        httpMethod: 'POST'
      }

      let ret = parseTagFromOpenAPIYAML(yamlDocument, event);
      expect(ret).to.deep.equal(['a', 'b', 'c'])
    });

    it("full path", () => {
      const yamlDocument = {
        'paths': {
          '/apikey-bo/aggregate': {
            'post': {
              'tags': ['a', 'b', 'c']
            }
          }
        }
      }
      const event = {
        path: 'a',
        openApiPath: '/apikey-bo/aggregate',
        httpMethod: 'POST'
      }

      let ret = parseTagFromOpenAPIYAML(yamlDocument, event);
      expect(ret).to.deep.equal(['a', 'b', 'c'])
    });

    it("patten matching", () => {
      const yamlDocument = {
        'paths': {
          '/apikey-bo/aggregate/{id}': {
            'post': {
              'tags': ['a', 'b', 'c']
            }
          }
        }
      }
      const event = {
        path: 'a',
        openApiPath: '/apikey-bo/aggregate/abcd',
        httpMethod: 'POST'
      }

      let ret = parseTagFromOpenAPIYAML(yamlDocument, event);
      expect(ret).to.deep.equal(['a', 'b', 'c'])
    });


    it("patten matching", () => {
      const yamlDocument = {
        'paths': {
          '/apikey-bo/aggregate/{id}/{boo}': {
            'post': {
              'tags': ['a', 'b', 'c']
            }
          }
        }
      }
      const event = {
        path: 'a',
        openApiPath: '/apikey-bo/aggregate/abcd/fgh',
        httpMethod: 'POST'
      }

      let ret = parseTagFromOpenAPIYAML(yamlDocument, event);
      expect(ret).to.deep.equal(['a', 'b', 'c'])
    });

    it("different pattern matching", () => {
      const yamlDocument = {
        'paths': {
          '/apikey-bo/aggregate/{id}/{boo}': {
            'post': {
              'tags': ['a', 'b', 'c']
            }
          },
          '/apikey-bo/aggregate/{id}': {
            'post': {
              'tags': ['d', 'e', 'f']
            }
          }
        }
      }
      const event = {
        path: 'a',
        openApiPath: '/apikey-bo/aggregate/abcd',
        httpMethod: 'POST'
      }

      let ret = parseTagFromOpenAPIYAML(yamlDocument, event);
      expect(ret).to.deep.equal(['d', 'e', 'f'])
    });

    it("missing pattern matching", () => {
      const yamlDocument = {
        'paths': {
          '/apikey-bo/aggregate/{id}': {
            'post': {
              'tags': ['a', 'b', 'c']
            }
          }        }
      }
      const event = {
        path: 'a',
        openApiPath: '/apikey-bo/aggregate/abcd/gavg',
        httpMethod: 'POST'
      }

      let ret = parseTagFromOpenAPIYAML(yamlDocument, event);
      expect(ret).to.deep.equal([])
    });

})

