const AllowedIssuerDao = require('./app/modules/dao/AllowedIssuerDao')
const UrlDownloader = require('./app/modules/http/UrlDownloader')
const JwtAttributesDao = require('./app/modules/dao/JwtAttributesDao')
const SqsHandler = require('./app/modules/aws/SQSFunctions')
const RedisHandler = require('./app/modules/aws/RedisFunctions')
const MetricsHandler = require('./app/modules/aws/MetricsHandler')
const DTO = require('./app/modules/dto')
const S3Functions = require('./app/modules/aws/S3Functions')

module.exports = {
    AllowedIssuerDao,
    DTO,
    UrlDownloader,
    JwtAttributesDao,
    SqsHandler,
    RedisHandler,
    MetricsHandler,
    S3Functions
}