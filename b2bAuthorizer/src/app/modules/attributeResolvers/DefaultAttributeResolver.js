const { INTENDED_USAGE_2_APPLICATION_ROLE, INTENDED_USAGE_2_SOURCE_CHANNEL } = require('../../config/constants');

function mapIntendedUsageToApplicationRole( intendedUsage ) {
    return INTENDED_USAGE_2_APPLICATION_ROLE[intendedUsage];
}

function mapIntendedUsageToSourceChannel( intendedUsage ) {
    return INTENDED_USAGE_2_SOURCE_CHANNEL[intendedUsage];
}

function computeSourceChannelDetails( sourceChannel, jwt, lambdaEvent ) {
    var sourceChannelDetails;
    if( sourceChannel ==  "B2B"  ) {
      let usingInterop = process.env.PDND_JWT_ISSUER == jwt.iss 
      sourceChannelDetails = usingInterop ? "INTEROP" : "NONINTEROP";
    }
    else {
      sourceChannelDetails = "";
    }
    return sourceChannelDetails;
  }

async function DefaultAttributeResolver( jwt, lambdaEvent, context, attrResolverCfg ) {
    const intendedUsage = lambdaEvent?.stageVariables?.IntendedUsage;
    if(intendedUsage === undefined) {
      throw new Error("Error on intendedUsage!!!")
    }
    context.applicationRole = mapIntendedUsageToApplicationRole( intendedUsage )
    context.sourceChannel = mapIntendedUsageToSourceChannel( intendedUsage )
    context.sourceChannelDetails = computeSourceChannelDetails( context.sourceChannel, jwt, lambdaEvent )
    return {
      context: context
    }
}

module.exports = DefaultAttributeResolver;