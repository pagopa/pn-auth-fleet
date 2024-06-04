const AllowedIssuerDao = require('./app/modules/dao/AllowedIssuerDao')
const UrlDownloader = require('./app/modules/http/UrlDownloader')
const JwtAttributesDao = require('./app/modules/dao/JwtAttributesDao')
const { sendMessage }= require('./app/modules/aws/SQSFunctions')

module.exports = {
    AllowedIssuerDao,
    UrlDownloader,
    JwtAttributesDao,
    sendMessage
}