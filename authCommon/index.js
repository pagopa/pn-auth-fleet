const AllowedIssuerDao = require('./app/modules/dao/AllowedIssuerDao')
const UrlDownloader = require('./app/modules/http/UrlDownloader')
const JwtAttributesDao = require('./app/modules/dao/JwtAttributesDao')
const SqsHandler = require('./app/modules/aws/SQSFunctions')
const RedisHandler = require('./app/modules/aws/RedisFunctions')

module.exports = {
    AllowedIssuerDao,
    UrlDownloader,
    JwtAttributesDao,
    SqsHandler,
    RedisHandler
}