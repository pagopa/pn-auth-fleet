const { GetObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const yaml = require("js-yaml");

const s3Client = new S3Client();

function transformPathPattern(path, servicePath) {
  const string = `^/${servicePath}`;
  const regex = new RegExp(string);

  return path.replaceAll(/({.*?})/g, "*").replace(regex, "");
}

/**
 * Retrieves the allowed API resources for a user based on an OpenAPI document stored in S3.
 *
 * Fetches the OpenAPI YAML document from S3, iterates over all paths and methods,
 * and returns only the resources the user is authorized to access based on tag matching.
 *
 * @param {Object} params
 * @param {Object} params.event - The request event object containing `servicePath` used to normalize paths.
 * @param {string} params.bucketName - The S3 bucket name where the OpenAPI document is stored.
 * @param {string} params.bucketKey - The S3 object key of the OpenAPI YAML document.
 * @param {string[]} params.userTags - The tags associated with the current user, used for authorization matching.
 * @param {string} params.tagName - The property name in the OpenAPI operation object that contains the authorization tags.
 * @param {boolean} [params.requireTags=false] - If `false`, endpoints without tags are considered public and always allowed.
 *   If `true`, only endpoints with at least one tag matching `userTags` are allowed.
 * @returns {Promise<Array<{method: string, path: string}>>} A list of allowed resources with their HTTP method and path.
 */
async function getAllowedResourcesFromS3({ event, bucketName, bucketKey, userTags, tagName, requireTags = false }) {
  const s3Object = await getS3Object(bucketName, bucketKey);
  const yamlDocument = yaml.load(s3Object);
  const yamlPaths = yamlDocument["paths"];
  const resources = [];

  for (const [path, yamlMethodElement] of Object.entries(yamlPaths)) {
    for (const [method, yamlElement] of Object.entries(yamlMethodElement)) {
      const tags = yamlElement[tagName];
      const isAllowed = tags
        ? arraysOverlap(tags, userTags)
        : !requireTags;

      if (isAllowed) {
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

function arraysOverlap(arrayA, arrayB) {
  // Function that checks if two arrays contains overlapping values
  if (arrayA.length === 0 || arrayB.length === 0) {
    return false;
  } else {
    for (let value of arrayA) {
      if (arrayB.includes(value)) {
        return true;
      }
    }
    return false;
  }
}

module.exports = { getAllowedResourcesFromS3 };
