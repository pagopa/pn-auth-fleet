module.exports.logEvent = (event) => {
	console.info("New event received", extractLoggableInfo(event));
}

const extractLoggableInfo = (event) => {
	let loggableObject = {
		"path": event["path"],
		"httpMethod": event["httpMethod"],
		"X-Amzn-Trace-Id": event["headers"]["X-Amzn-Trace-Id"],
		"x-api-key": this.anonymizeKey(event["headers"]["x-api-key"])
	}

	return loggableObject;
}

module.exports.anonymizeKey = (cleanString) => {
	if(cleanString.length < 6)
		return "".padStart(cleanString.length,"*")
	
	let firstTwoChars = cleanString.substring(0, 2);
	let lastTwoChars = cleanString.substring(cleanString.length - 2, cleanString.length);

    let hiddenStringLength = cleanString.length - 4;
	let hiddenString = "".padStart(hiddenStringLength,"*");

	return firstTwoChars + hiddenString + lastTwoChars;
}

