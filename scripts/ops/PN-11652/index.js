const { parseArgs } = require('util');
const fs = require('fs');
const path = require('path');
const { AwsClientsWrapper } = require("./libs/AwsClientWrapper");
const { unmarshall } = require('@aws-sdk/util-dynamodb');

function appendJsonToFile(fileName, jsonData){
  if(!fs.existsSync("files"))
    fs.mkdirSync("files", { recursive: true });
  fs.appendFileSync(fileName, JSON.stringify(jsonData) + "\n")
}

function _checkingParameters(args, values){
  const usage = "Usage: node index.js --envName <env-name>"
  //CHECKING PARAMETER
  args.forEach(el => {
    if(el.mandatory && !values.values[el.name]){
      console.log("Param " + el.name + " is not defined")
      console.log(usage)
      process.exit(1)
    }
  })
  args.filter(el=> {
    return el.subcommand.length > 0
  }).forEach(el => {
    if(values.values[el.name]) {
      el.subcommand.forEach(val => {
        if (!values.values[val]) {
          console.log("SubParam " + val + " is not defined")
          console.log(usage)
          process.exit(1)
        }
      })
    }
  })
}

async function main() {

  const args = [
    { name: "envName", mandatory: true, subcommand: [] },
    { name: "step", mandatory: true, subcommand: [] },
    { name: "dryrun", mandatory: false, subcommand: [] },
  ]
  const values = {
    values: { envName, step, dryrun },
  } = parseArgs({
    options: {
      envName: {
        type: "string", short: "e", default: undefined
      },
      step: {
        type: "string", short: "s", default: undefined
      },
      dryrun: {
        type: "boolean", short: "b", default: false
      },
    },
  });  
  _checkingParameters(args, values)
  const awsClient = new AwsClientsWrapper( envName );
  let first = true;
  var results = []
  var lastEvaluatedKey = null
  while(first || lastEvaluatedKey != null) {
    var res = await awsClient._scanRequest("pn-AuthJwtAttributes", lastEvaluatedKey);
    if(res.LastEvaluatedKey) {
      lastEvaluatedKey = res.LastEvaluatedKey
    } 
    else {
      lastEvaluatedKey = null;
      first = false;
    }
    results = results.concat(res.Items);
  }
 
  for(let i = 0; i < results.length; i++) {
    const row = unmarshall(results[i])
    const keys = {
      "hashKey": row.hashKey,
      "sortKey": row.sortKey
    } 
    let contextAttributes = row.contextAttributes
    if(step.toUpperCase() == "A"){
      console.log("Step A Uppercasing application role and allowed application roles in context attributes")
      //Allowed application roles
      let allowedApplicationRoles = []
      contextAttributes.allowedApplicationRoles.forEach(element => {
        allowedApplicationRoles.push(element.toUpperCase())
      });
      contextAttributes.allowedApplicationRoles = allowedApplicationRoles
      //Application role
      let applicationRole = contextAttributes.applicationRole.toUpperCase()
      contextAttributes.applicationRole = applicationRole
    }
    else if(step.toUpperCase() == "B") {
      console.log("Step B removing application role in context attributes")
      delete contextAttributes["applicationRole"]
    }
    if(!dryrun) {
      console.log(`Updating hashkey=${keys.hashKey} sortKey=${keys.sortKey} for step=${step.toUpperCase()}`)
      await awsClient._updateItem("pn-AuthJwtAttributes", keys, contextAttributes)
    }
    else {
      console.log(`Dryrun: Updating hashkey=${keys.hashKey} sortKey=${keys.sortKey} for step=${step.toUpperCase()}`)
      console.log(contextAttributes)
    }
  }
}

main();