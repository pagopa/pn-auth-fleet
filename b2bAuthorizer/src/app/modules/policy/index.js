const customPolicy = require("./customPolicy.js");

const defaultDenyAllPolicyDocument = {
    Version: "2012-10-17",
    Statement: [
      {
        Action: "execute-api:Invoke",
        Effect: "Deny",
        Resource: "*",
      },
    ]
};

const defaultAllowPolicyDocument = {
    Version: "2012-10-17",
    Statement: [
      {
        Action: "execute-api:Invoke",
        Effect: "Allow",
        Resource: "*",
      },
    ]
};

class PolicyService {

    #logger

    constructor(logger, ) {
        this.#logger = logger;
        
    }

    #validateIntendedUsage(context, intendedUsage) {
        if (!intendedUsage) {
            this.#logger.warn('IntendedUsage not found in stageVariables');
            return false;
        }
        
        if(!context.sourceChannel){
          this.#logger.warn('sourceChannel not found in context');
          return false;
        }
        // W.I. 1.6 In futuro potrebbe essere necessario un mapping
        return intendedUsage.toLowerCase() === context.sourceChannel.toLowerCase();
    }
      
    #validateApplicationRoles(context) {
        if(!context.allowedApplicationRoles){
            this.#logger.warn('allowedApplicationRoles not found in context');
            return false;
        }
      
        if(!context.applicationRole){
            this.#logger.warn('applicationRole not found in context');
            return false;
        }
      
        return context.allowedApplicationRoles.includes(context.applicationRole);
    }

    async generatePolicyDocument(context, lambdaEvent) {
        const intendedUsage = lambdaEvent?.stageVariables?.IntendedUsage;
      
        if (!this.#validateIntendedUsage(context, intendedUsage)) {
          return defaultDenyAllPolicyDocument;
        }
      
        if(!this.#validateApplicationRoles(context)){
          return defaultDenyAllPolicyDocument;
        }

        if(context.callableApiTags){
          return await customPolicy.getCustomPolicyDocument(lambdaEvent, context.callableApiTags);
        }
      
        return defaultAllowPolicyDocument;
    }


    normalizeContextForIAMPolicy(context){
      const iamPolicyContext = { ...context };
      for(const key in iamPolicyContext){
        // if context[key] is an array or an object, we need to convert it to string
        if(typeof iamPolicyContext[key] === 'object'){
          iamPolicyContext[key] = JSON.stringify(iamPolicyContext[key]);
        }
      }

      return iamPolicyContext
    }

    generateDenyPolicyDocument(){
      return defaultDenyAllPolicyDocument;
    }
}

module.exports = PolicyService