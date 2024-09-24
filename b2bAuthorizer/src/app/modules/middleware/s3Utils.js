const { GetObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const yaml = require("js-yaml");

const { arraysOverlap } = require("./utils.js");

const s3Client = new S3Client();

function transformPathPattern(path, servicePath) {
  const string = `^/${servicePath}`;
  const regex = new RegExp(string);

  return path.replaceAll(/({.*?})/g, "*").replace(regex, "");
}

async function getResourcesFromS3(event, bucket, key) {
  // Function that collects the S3 object containing the openAPI document and extract
  // the tags of the method invoked
  const s3Object = await getS3Object(bucket, key);
  const yamlDocument = yaml.load(s3Object);
  const yamlPaths = yamlDocument["paths"];
  const resources = [];

  for (const [path, yamlMethodElement] of Object.entries(yamlPaths)) {
    for (const [method, yamlElement] of Object.entries(yamlMethodElement)) {
      const tags = yamlElement["x-api-permissions"];
      resources.push({
        method: method.toUpperCase(),
        path: transformPathPattern(path, event.servicePath),
        tags: tags
      });
  }
  }
  
  return resources;
}

async function getAllowedResourcesFromS3(event, bucket, key, userTags) {
  // Function that collects the S3 object containing the openAPI document and extract
  // the tags of the method invoked
  const s3Object = await getS3Object(bucket, key);
  const yamlDocument = yaml.load(s3Object);
  const yamlPaths = yamlDocument["paths"];
  const resources = [];

  for (const [path, yamlMethodElement] of Object.entries(yamlPaths)) {
    for (const [method, yamlElement] of Object.entries(yamlMethodElement)) {
      const tags = yamlElement["x-api-permissions"];
      if (!tags || arraysOverlap(tags, userTags)) {
        resources.push({
          method: method.toUpperCase(),
          path: transformPathPattern(path, event.servicePath),
        });
      }
    }
  }
  return resources;
}

function getS3Object(bucket, key) {
  const input = {
    Bucket: bucket,
    Key: key,
  };
  const command = new GetObjectCommand(input);
  const response = s3Client
    .send(command)
    .then((data) => {
      return data.Body.transformToString();
    })
    .catch((err) => {
      throw err;
    });
  return response;
}

module.exports = { getAllowedResourcesFromS3, getResourcesFromS3 };
