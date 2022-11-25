module.exports.anonymizeKey = (cleanString) => {
    let hiddenStringLength = cleanString.length - 4;
	let offset = "".padStart(hiddenStringLength,"*");

	return cleanString.substring(0, 2) + offset + cleanString.substring(cleanString.length - 2, cleanString.length);
}