const rewire = require('rewire');
const { expect } = require("chai");


describe('GenericDataCache Tests', () => {
  it('item not found', async () => {
    const gCache = rewire('../app/modules/cache/GenericDataCache');

  
    const cache = new gCache(60);
    const data =  cache.getCacheItem('iss');
    expect(data).to.equal(null);
    
  });

  it('item cached', async () => {
    const gCache = rewire('../app/modules/cache/GenericDataCache');

    const cache = new gCache(60);
    const data =  cache.getCacheItem('iss');
    expect(data).to.equal(null);
    const supplied = {a: 1, b: 2};
    cache.setCacheItem('iss', supplied);
    const data1 =  cache.getCacheItem('iss');
    expect(data1).to.equal(supplied);   
  });


  it('item cached but cache invalid', async () => {
    const gCache = rewire('../app/modules/cache/GenericDataCache');
    const cache = new gCache(-10);
    const supplied = {a: 1, b: 2};
    cache.setCacheItem('iss', supplied);
    const data1 =  cache.getCacheItem('iss');
    expect(data1).to.equal(null);
  });


})