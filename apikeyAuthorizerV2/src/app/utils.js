module.exports.anonymizeKey = (cleanString) => {
	if(cleanString.length < 6)
		return "".padStart(cleanString.length,"*")
	
	let firstTwoChars = cleanString.substring(0, 2);
	let lastTwoChars = cleanString.substring(cleanString.length - 2, cleanString.length);

    let hiddenStringLength = cleanString.length - 4;
	let hiddenString = "".padStart(hiddenStringLength,"*");

	return firstTwoChars + hiddenString + lastTwoChars;
}


module.exports.logEvent = (event) => {
	console.info("New event received", extractLoggableInfoFromEvent(event));
}

const extractLoggableInfoFromEvent = (event) => {
	let loggableObject = {
		"path": event["path"],
		"httpMethod": event["httpMethod"],
		"X-Amzn-Trace-Id": event["headers"]["X-Amzn-Trace-Id"],
		"x-api-key": this.anonymizeKey(event["headers"]["x-api-key"])
	}

	return loggableObject;
}

module.exports.logIamPolicy = (iamPolicy) => {
	console.log("IAM Policy:", maskLoggableInfoFromIamPolicy(iamPolicy));
}

const maskLoggableInfoFromIamPolicy = (iamPolicy) => {
	let iamPolicyCopy = JSON.parse(JSON.stringify(iamPolicy));
	iamPolicyCopy.usageIdentifierKey = this.anonymizeKey(iamPolicyCopy.usageIdentifierKey);
	iamPolicyCopy.context.uid = anonymizeUid(iamPolicyCopy.context.uid);
	return iamPolicyCopy;
}

const anonymizeUid = (uid) => {
	if(uid.startsWith("APIKEY-")){
		let apikeyToHide = uid.substring(uid.indexOf("-") + 1);
    	return "APIKEY-" + this.anonymizeKey(apikeyToHide);
	}
    return this.anonymizeKey(uid);
}



