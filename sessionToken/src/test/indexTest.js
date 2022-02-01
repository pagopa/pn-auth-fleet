const expect = require("chai").expect;
const lambdaTester = require("lambda-tester");
const proxyquire = require("proxyquire");

// Import lambda funcion
const lambda = require('../../index.js');
/*
const expiredToken = {
  authorizationToken: 'eyJraWQiOiJqd3QtZXhjaGFuZ2VfZDQ6ZWY6NjQ6NzY6YWY6MjI6MWY6NDg6MTA6MDM6ZTQ6NjE6NmU6Y2M6Nzk6MmYiLCJhbGciOiJSUzI1NiJ9.eyJlbWFpbCI6InJhb3VsODdAbGliZXJvLml0IiwiZmFtaWx5X25hbWUiOiJHYWxsaSIsImZpc2NhbF9udW1iZXIiOiJHTExNUkE3N000M0EzMzJPIiwibmFtZSI6Ik1hdXJvIiwiZnJvbV9hYSI6ZmFsc2UsInVpZCI6IjEyZTNjNWE4LTA2NWItNDExZi1hMzY0LWYxOGQ2NjI0MmU0ZiIsImxldmVsIjoiTDIiLCJpYXQiOjE2NDM2NDMyNzcsImV4cCI6MTY0MzY1MDQ3NywiaXNzIjoiYXBpLnNlbGZjYXJlLnBhZ29wYS5pdCIsImp0aSI6IjAyOTdjYTllLTRhZWMtNDRiMy04M2FkLTAwYWI5NGI0ZWU4NyIsImF1ZCI6Ind3dy5iZXRhLnBuLnBhZ29wYS5pdCIsIm9yZ2FuaXphdGlvbiI6eyJpZCI6ImNfaDI4MiIsInJvbGUiOiJyZWZlcmVudGUgYW1taW5pc3RyYXRpdm8iLCJmaXNjYWxfY29kZSI6IjAwMTAwNzAwNTc0In0sImRlc2lyZWRfZXhwIjoxNjQzNjQ2ODcwfQ.G7_Hosr3WdFEEOd9dFzA-2p9BO6TUBzeUIcoPDmv5DJraZanQMnKpslnjQDuyeQrBaK0a7xKL10u7vbllaRbYLPdJ8blDGpPfJEiMyILg-3NC6zsGdyImSaCGAhhzWaVrbWAhcZAOqWS4mCh46jy6hAvGRd-2wK6dPpzHjKzLZYP7VBdm7Vqd63zf31pG6Z5wshHpJVKvfoiPo8IaZMg83eN2NlFYF5MV1ftXgiMuBNB613bnd7MixfyychEdRMtnQdycV0zKTcdGtXfVOaOv5TiDXHKbXqGUrAU0PqRvtek7DF5C3pZUpK90dJFIgdovMDDF90ShDz6abogrLAtYA'
}
//JWT expired
lambdaTester( lambda.handler )
  .event( expiredToken )
  .expectResult((result) => {
    // Check if code exist
    console.log('the result is ', result);
    expect(result.statusCode).to.equal(400);
})
*/

// Create a object which will have mock functions
const dataStub = {

  handleEvent: function (params) {
    return {  
      statusCode: 400,
      body: 'error'
    }
  },

};

/*
// Exporting the lambda with mock dependencies
const lambda = proxyquire.noCallThru().load("../../index.js", {
  // Replacing the dependencies present inside lambda function (app.js) with mock functions
  "./src/app/eventHandler.js": dataStub,
});
*/

const workingToken = {
  authorizationToken: 'eyJraWQiOiJqd3QtZXhjaGFuZ2VfZDQ6ZWY6NjQ6NzY6YWY6MjI6MWY6NDg6MTA6MDM6ZTQ6NjE6NmU6Y2M6Nzk6MmYiLCJhbGciOiJSUzI1NiJ9.eyJlbWFpbCI6InJhb3VsODdAbGliZXJvLml0IiwiZmFtaWx5X25hbWUiOiJHYWxsaSIsImZpc2NhbF9udW1iZXIiOiJHTExNUkE3N000M0EzMzJPIiwibmFtZSI6Ik1hdXJvIiwiZnJvbV9hYSI6ZmFsc2UsInVpZCI6IjEyZTNjNWE4LTA2NWItNDExZi1hMzY0LWYxOGQ2NjI0MmU0ZiIsImxldmVsIjoiTDIiLCJpYXQiOjE2NDM2NDMyNzcsImV4cCI6NDA3MzYyODgwMCwiaXNzIjoiYXBpLnNlbGZjYXJlLnBhZ29wYS5pdCIsImp0aSI6IjAyOTdjYTllLTRhZWMtNDRiMy04M2FkLTAwYWI5NGI0ZWU4NyIsImF1ZCI6Ind3dy5iZXRhLnBuLnBhZ29wYS5pdCIsIm9yZ2FuaXphdGlvbiI6eyJpZCI6ImNfaDI4MiIsInJvbGUiOiJyZWZlcmVudGUgYW1taW5pc3RyYXRpdm8iLCJmaXNjYWxfY29kZSI6IjAwMTAwNzAwNTc0In0sImRlc2lyZWRfZXhwIjoxNjQzNjQ2ODcwfQ.3sQwE8d9wNid_cipdIBP0ghn1gdOKvMVyEEsQugIuLYd7FXu0gLGpNEw3nk6Cc--dXXoWl6UWZzKBDOVkOmmNn92MEZksAEi2ftO9jktWZVxPridQ8GHkxT7ezhFGUQqxkd3wYZsNNsOF4fEvem_pGgUYaaN_fO3aKfa1CFNO-zlENO0NEzsg1yHAgaH7I-w7nGX-9ZYkUV85ws_TGELoj9zAOLzHT1yYF56J8q92oI63YfwBRJ4bUioH41wlIqwkEdxp2CjqOSHWdLoTGJbJeH3A3000yqysa5LqMcanMyqzzES3oazKAZRvYn84x1nBVsbxkQ0fhqCTnH0HDpzRQ'
}
lambdaTester( lambda.handler )
  .event( workingToken )
  .expectResult((result) => {
    // Check if code exist
    console.log('the result is ', result);
    expect(result.statusCode).to.equal(400);
})

