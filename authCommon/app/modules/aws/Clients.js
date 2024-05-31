// Create a service client module using ES6 syntax.
const { S3Client } = require("@aws-sdk/client-s3");

exports.s3Client = new S3Client({})