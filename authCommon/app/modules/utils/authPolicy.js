/**
 * AuthPolicy receives a set of allowed and denied methods and generates a valid
 * AWS policy for the API Gateway authorizer. The constructor receives the calling
 * user principal, the AWS account ID of the API owner, and an apiOptions object.
 * The apiOptions can contain an API Gateway RestApi Id, a region for the RestApi, and a
 * stage that calls should be allowed/denied for. For example
 * {
 *   restApiId: "xxxxxxxxxx",
 *   region: "us-east-1",
 *   stage: "dev"
 * }
 *
 * const testPolicy = new AuthPolicy("[principal user identifier]", "[AWS account id]", apiOptions);
 * testPolicy.allowMethod(AuthPolicy.HttpVerb.GET, "/users/username");
 * testPolicy.denyMethod(AuthPolicy.HttpVerb.POST, "/pets");
 * context.succeed(testPolicy.build());
 *
 * @class AuthPolicy
 * @constructor
 */
function AuthPolicy(principal, awsAccountId, apiOptions) {
  this.awsAccountId = awsAccountId;
  this.principalId = principal;
  this.version = "2012-10-17";
  this.pathRegex = new RegExp("^[/.a-zA-Z0-9-*]+$");
  this.allowMethods = [];
  this.denyMethods = [];

  if (!apiOptions || !apiOptions.restApiId) {
    this.restApiId = "<<restApiId>>";
  } else {
    this.restApiId = apiOptions.restApiId;
  }
  if (!apiOptions || !apiOptions.region) {
    this.region = "<<region>>";
  } else {
    this.region = apiOptions.region;
  }
  if (!apiOptions || !apiOptions.stage) {
    this.stage = "<<stage>>";
  } else {
    this.stage = apiOptions.stage;
  }
}

AuthPolicy.HttpVerb = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  PATCH: "PATCH",
  HEAD: "HEAD",
  DELETE: "DELETE",
  OPTIONS: "OPTIONS",
  ALL: "*",
};

AuthPolicy.prototype = (function () {
  const addMethod = function (effect, verb, resource, conditions) {
    if (verb != "*" && !AuthPolicy.HttpVerb.hasOwnProperty(verb)) {
      throw new Error(
        "Invalid HTTP verb " + verb + ". Allowed verbs in AuthPolicy.HttpVerb"
      );
    }

    if (!this.pathRegex.test(resource)) {
      throw new Error(
        "Invalid resource path: " +
          resource +
          ". Path should match " +
          this.pathRegex
      );
    }

    let cleanedResource = resource;
    if (resource.substring(0, 1) == "/") {
      cleanedResource = resource.substring(1, resource.length);
    }
    const resourceArn =
      "arn:aws:execute-api:" +
      this.region +
      ":" +
      this.awsAccountId +
      ":" +
      this.restApiId +
      "/" +
      this.stage +
      "/" +
      verb +
      "/" +
      cleanedResource;

    /* istanbul ignore else */
    if (effect.toLowerCase() == "allow") {
      this.allowMethods.push({
        resourceArn: resourceArn,
        conditions: conditions,
      });
    } else if (effect.toLowerCase() == "deny") {
      this.denyMethods.push({
        resourceArn: resourceArn,
        conditions: conditions,
      });
    }
  };

  const getEmptyStatement = function (effect) {
    effect =
      effect.substring(0, 1).toUpperCase() +
      effect.substring(1, effect.length).toLowerCase();
    const statement = {};
    statement.Action = "execute-api:Invoke";
    statement.Effect = effect;
    statement.Resource = [];

    return statement;
  };

  const getStatementsForEffect = function (effect, methods) {
    const statements = [];

    if (methods.length > 0) {
      const statement = getEmptyStatement(effect);

      for (let i = 0; i < methods.length; i++) {
        const curMethod = methods[i];
        if (
          curMethod.conditions === null ||
          curMethod.conditions.length === 0
        ) {
          statement.Resource.push(curMethod.resourceArn);
        } else {
          const conditionalStatement = getEmptyStatement(effect);
          conditionalStatement.Resource.push(curMethod.resourceArn);
          conditionalStatement.Condition = curMethod.conditions;
          statements.push(conditionalStatement);
        }
      }

      if (statement.Resource !== null && statement.Resource.length > 0) {
        statements.push(statement);
      }
    }

    return statements;
  };

  return {
    constructor: AuthPolicy,

    allowAllMethods: function () {
      addMethod.call(this, "allow", "*", "*", null);
    },

    denyAllMethods: function () {
      addMethod.call(this, "deny", "*", "*", null);
    },

    allowMethod: function (verb, resource) {
      addMethod.call(this, "allow", verb, resource, null);
    },

    denyMethod: function (verb, resource) {
      addMethod.call(this, "deny", verb, resource, null);
    },

    allowMethodWithConditions: function (verb, resource, conditions) {
      addMethod.call(this, "allow", verb, resource, conditions);
    },

    denyMethodWithConditions: function (verb, resource, conditions) {
      addMethod.call(this, "deny", verb, resource, conditions);
    },

    build: function (context = {}) {
      if (
        (!this.allowMethods || this.allowMethods.length === 0) &&
        (!this.denyMethods || this.denyMethods.length === 0)
      ) {
        throw new Error("No statements defined for the policy");
      }

      const policy = {};
      policy.principalId = this.principalId;
      const doc = {};
      doc.Version = this.version;
      doc.Statement = [];

      doc.Statement = doc.Statement.concat(
        getStatementsForEffect.call(this, "Allow", this.allowMethods)
      );
      doc.Statement = doc.Statement.concat(
        getStatementsForEffect.call(this, "Deny", this.denyMethods)
      );

      policy.policyDocument = doc;
      policy.context = context;

      return policy;
    },
  };
})();

module.exports = { AuthPolicy };
