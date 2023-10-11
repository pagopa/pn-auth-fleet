const { mockClient } = require("aws-sdk-client-mock");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { expect } = require("chai");
const fs = require("fs");

const { getAllowedResourcesFromS3 } = require("../app/s3Utils");

const ddbMock = mockClient(S3Client);

describe("s3 tests", function () {
  this.beforeAll(() => {
    ddbMock.reset();
  });

  it("test tags extraction", async () => {
    const yamlDocument = fs.readFileSync("./src/test/mock.yaml");
    ddbMock.on(GetObjectCommand).resolves({
      Body: {
        transformToString: function () {
          return yamlDocument;
        },
      },
    });

    const event = {
      path: "/aggregate",
      servicePath: "api-key-bo",
      httpMethod: "POST",
    };
    const bucket = "buck";
    const key = "key";
    const resources = await getAllowedResourcesFromS3(event, bucket, key, [
      "Aggregate",
    ]);

    console.log("resources", resources);
    expect(resources.length).eq(9);
  });

  it("test pattern", async () => {
    const yamlDocument = fs.readFileSync("./src/test/mock-patterns.yaml");
    ddbMock.on(GetObjectCommand).resolves({
      Body: {
        transformToString: function () {
          return yamlDocument;
        },
      },
    });

    const event = {
      path: "/aggregate",
      servicePath: "api-key-bo",
      httpMethod: "POST",
    };
    const bucket = "buck";
    const key = "key";
    const resources = await getAllowedResourcesFromS3(event, bucket, key, [
      "Aggregate",
    ]);

    console.log("resources", resources);
    expect(resources.length).eq(1);
    expect(resources[0].path).equals("/aggregate/*/aadadas/*");
  });

  it("test trigger ", async () => {
    ddbMock.on(GetObjectCommand).rejects(new Error("TEST ERROR"));

    const event = {
      path: "/aggregate",
      httpMethod: "POST",
      servicePath: "api-key-bo",
    };
    const bucket = "buck";
    const key = "key";
    try {
      const tags = await getAllowedResourcesFromS3(event, bucket, key, []);
    } catch (error) {
      expect(error).to.not.be.null;
      expect(error).to.not.be.undefined;
      expect(error.message).to.equal("TEST ERROR");
    }
  });
});
