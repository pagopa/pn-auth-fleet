const { mockClient } = require("aws-sdk-client-mock");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { expect } = require("chai");
const fs = require("fs");

const { getAllowedResourcesFromS3 } = require("../app/modules/utils/s3Utils");
const TAG_NAME = "x-api-permissions";

describe("s3 tests", function () {
  let ddbMock;

  before(() => {
    ddbMock = mockClient(S3Client);
  });

  after(() => {
    ddbMock.restore();
  });

  it("test tags extraction", async () => {
    const yamlDocument = fs.readFileSync("./test/resources/mock.yaml");
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
    const resources = await getAllowedResourcesFromS3({
      event,
      bucket,
      key,
      userTags: ["Aggregate"],
      tagName: TAG_NAME,
    });

    expect(resources.length).eq(9);
  });

  it("test pattern", async () => {
    const yamlDocument = fs.readFileSync("./test/resources/mock-patterns.yaml");
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
    const resources = await getAllowedResourcesFromS3({
      event,
      bucket,
      key,
      userTags: ["Aggregate"],
      tagName: TAG_NAME,
    });

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
      const tags = await getAllowedResourcesFromS3({ event, bucket, key, userTags: [], tagName: TAG_NAME });
    } catch (error) {
      expect(error).to.not.be.null;
      expect(error).to.not.be.undefined;
      expect(error.message).to.equal("TEST ERROR");
    }
  });

  it("test requireTags=false includes endpoints without tags", async () => {
    const yamlDocument = fs.readFileSync("./test/resources/mock-require-tags.yaml");
    ddbMock.on(GetObjectCommand).resolves({
      Body: {
        transformToString: function () {
          return yamlDocument;
        },
      },
    });

    const event = { path: "/items", servicePath: "notifications", httpMethod: "GET" };
    const SUPPORT_TAG_NAME = "x-support-role-permissions";
    const resources = await getAllowedResourcesFromS3({
      event,
      bucket: "buck",
      key: "key",
      userTags: ["Aggregate"],
      tagName: SUPPORT_TAG_NAME,
      requireTags: false,
    });

    expect(resources.length).eq(2);
  });

  it("test requireTags=true excludes endpoints without tags", async () => {
    const yamlDocument = fs.readFileSync("./test/resources/mock-require-tags.yaml");
    ddbMock.on(GetObjectCommand).resolves({
      Body: {
        transformToString: function () {
          return yamlDocument;
        },
      },
    });

    const event = { path: "/items", servicePath: "notifications", httpMethod: "GET" };
    const SUPPORT_TAG_NAME = "x-support-role-permissions";
    const resources = await getAllowedResourcesFromS3({
      event,
      bucket: "buck",
      key: "key",
      userTags: ["Aggregate"],
      tagName: SUPPORT_TAG_NAME,
      requireTags: true,
    });

    expect(resources.length).eq(1);
    expect(resources[0].method).eq("GET");
    expect(resources[0].path).eq("/items");
  });
});
