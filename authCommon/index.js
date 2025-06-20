const AllowedIssuerDao = require('./app/modules/dao/AllowedIssuerDao')
const UrlDownloader = require('./app/modules/http/UrlDownloader')
const JwtAttributesDao = require('./app/modules/dao/JwtAttributesDao')
const SqsHandler = require('./app/modules/aws/SQSFunctions')
const RedisHandler = require('./app/modules/aws/RedisFunctions')
const MetricsHandler = require('./app/modules/aws/MetricsHandler')
const DTO = require('./app/modules/dto')
const S3Functions = require('./app/modules/aws/S3Functions')
const { RADD_RESOLVER_NAME, ATTR_PREFIX, ISS_PREFIX } = require('./app/modules/dao/constants')
const RedisClient = require('./app/modules/aws/Clients')

const { prepareJWKSRenewTimeMetric } = require('./app/modules/utils/metricsUtils')

module.exports = {
    AllowedIssuerDao,
    DTO,
    UrlDownloader,
    JwtAttributesDao,
    SqsHandler,
    RedisHandler,
    MetricsHandler,
    S3Functions,
    COMMON_COSTANTS: {RADD_RESOLVER_NAME, ATTR_PREFIX, ISS_PREFIX},
    prepareJWKSRenewTimeMetric,
    RedisClient
}