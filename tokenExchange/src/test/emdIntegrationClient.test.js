const chaiAsPromised = require("chai-as-promised");
const chai = require("chai");
const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");

const { getRetrievalPayload } = require("../app/emdIntegrationClient.js");

chai.use(chaiAsPromised);
const expect = chai.expect;

describe("get RetrievalPayload", () => {
    let mock;

    before(() => {
        mock = new MockAdapter(axios);
        process.env = Object.assign(process.env, {
            PN_EMD_INTEGRATION_BASEURL: "http://${ApplicationLoadBalancerDomain}:8080"
          });
    });

    after(() => {
        mock.restore();
    });

    it("OK", async () => {
        const retrievalId = "0e4c6629-8753-234s-b0da-1f796999ec2-15038637960920";
        const result = {
            retrievalId: retrievalId,
            tppId: "0e3bee29-8753-447c-b0da-1f7965558ec2-1706867960900",
            deepLink: "https://example.com/deeplink/123e4567-e89b-12d3-a456-426614174000?userId=1234567890&session=abcdef",
            paymentButton: "Banca1",
            originId: "XRUZ-GZAJ-ZUEJ-202407-W-1"
        };
        mock.onGet("http://${ApplicationLoadBalancerDomain}:8080/emd-integration-private/token/check-tpp", 
            { params: { retrievalId:  retrievalId}}
        ).reply(200, result);
        const response = await getRetrievalPayload("0e4c6629-8753-234s-b0da-1f796999ec2-15038637960920");
        expect(response.retrievalId).to.be.equal(result.retrievalId);
    });

    it("KO", async () => {
        const retrievalId = "0e4c6629-8753-234s-b0da-1f796999ec2-15038637960920";
        mock.onGet("http://${ApplicationLoadBalancerDomain}:8080/emd-integration-private/token/check-tpp", 
            { params: { retrievalId:  retrievalId}}
        ).reply(500);

        await expect(getRetrievalPayload(retrievalId)).to.be.rejectedWith(
            Error,
            "Error in get retrievalId"
        );
    });
})