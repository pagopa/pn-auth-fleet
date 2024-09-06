const { UPSERT_ACTION_TYPE, DELETE_ACTION_TYPE } = require('../constants')
const JwtIssuerDeleteCommand = require('./JwtIssuerDeleteCommand')
const JwtIssuerUpsertCommand = require('./JwtIssuerUpsertCommand')

function makeCommand(body){
    const { actionType } = body
    switch(actionType){
        case UPSERT_ACTION_TYPE:
            return new JwtIssuerUpsertCommand(body)
        case DELETE_ACTION_TYPE:
            return new JwtIssuerDeleteCommand(body)
        default:
            throw new Error('Invalid operation type')
    }
}

module.exports = {
    makeCommand
}