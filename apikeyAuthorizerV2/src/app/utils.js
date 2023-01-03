module.exports.anonymizeKey = (cleanString) => {
	if(cleanString.length < 6)
		return "".padStart(cleanString.length,"*")
		
    let hiddenStringLength = cleanString.length - 4;
	let offset = "".padStart(hiddenStringLength,"*");

	return cleanString.substring(0, 2) + offset + cleanString.substring(cleanString.length - 2, cleanString.length);
}

module.exports.anonymizeEvent = (event) => {
	let anonymizedEvent = {...event};

	if(anonymizedEvent["headers"] && anonymizedEvent["headers"]["x-api-key"])
		anonymizedEvent["headers"]["x-api-key"] = this.anonymizeKey(anonymizedEvent["headers"]["x-api-key"]);
	if(anonymizedEvent["multiValueHeaders"] && anonymizedEvent["multiValueHeaders"]["x-api-key"] && anonymizedEvent["multiValueHeaders"]["x-api-key"].length) {
		let apiKeys = anonymizedEvent["multiValueHeaders"]["x-api-key"];
		for(let i = 0; i < apiKeys.length; i++) {
			apiKeys[i] = this.anonymizeKey(apiKeys[i]);
		}
	}
	return anonymizedEvent;
}

