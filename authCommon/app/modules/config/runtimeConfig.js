const { Hash } = require('@aws-sdk/hash-node');

const getRuntimeConfig = (config) => ({
  runtime: 'node',
  sha256: config?.sha256 ?? Hash.bind(null, 'sha256'),
  credentials: config?.credentials,
  region: config?.region,
  expiresIn: 900,
  ...config,
});


module.exports = { getRuntimeConfig };