const {
    getAssertionDoc,
	validateAssertionPeriod,
	validateUserId,
	validateInResponseTo,
	getIdpCertData,
	validateSignature,
	validateFullNameHeader
} = require("./assertionValidation");

const CommandResult = require('./model/CommandResult');
const { lollipopConfig } = require("../app/config/lollipopConsumerRequestConfig");
const { VALIDATION_ERROR_CODES } = require("../app/constants/lollipopErrorsConstants");
const LollipopAssertionException = require('../app/exception/lollipopAssertionException');

/**
 * Validazione delle request assertion.
 *
 * @async
 * @param {Object} request - Oggetto contenente gli header della richiesta
 * @param {Object} request.headerParams.headers - La mappa key/value degli header
 * @return {Object} CommandResult	   	
 * @throws {LollipopAssertionException} Se una delle validazioni fallisce
 */
async function validateLollipopAssertion(request) {

	try{
		console.log("Starting validateLollipopAssertion...");
		const headers = request.headerParams.headers || request.headerParams;
		//Recupero assertionDoc
		const assertionDoc = await getAssertionDoc(
		    headers[lollipopConfig.authJWTHeader],
		    headers[lollipopConfig.assertionRefHeader]
		);
		
		const result = new CommandResult();
		
		//Recupero i Dati del Certificato IdP: Necessario per la verifica della Signature
		const idpCertDataList = await getIdpCertData(request, assertionDoc);
		if(!idpCertDataList){
			console.error("Some error occurred in retrieving certification data from IDP");
			throw new LollipopAssertionException(VALIDATION_ERROR_CODES.IDP_CERT_DATA_NOT_FOUND, "Some error occurred in retrieving certification data from IDP");
		}

		//Validazioni asincrone in parallelo
		const criticalValidationPromises = [
			// 1 - Validazione Periodo
			(async () => {
				const isValid = await validateAssertionPeriod(assertionDoc);
				if (!isValid) throw new LollipopAssertionException(
						VALIDATION_ERROR_CODES.INVALID_ASSERTION_PERIOD, "The assertion has expired");
			})(),
			// 2 - Validazione User ID
			(async () => {
				const isValid = await validateUserId(request, assertionDoc);
				if (!isValid) throw new LollipopAssertionException(
						VALIDATION_ERROR_CODES.INVALID_USER_ID, "The user id in the assertion does not match the request header");
			})(),
			// 3 - Validazione InResponseTo
			(async () => {
				const isValid = await validateInResponseTo(request, assertionDoc);
				if (!isValid) throw new LollipopAssertionException(
						VALIDATION_ERROR_CODES.INVALID_IN_RESPONSE_TO, "The hash of provided public key do not match the InResponseTo in the assertion");
			})(),
			// 4 - Validazione Firma (Dipende da idpCertDataList)
			(async () => {
				const isValid = await validateSignature(assertionDoc, idpCertDataList);
				if (!isValid) throw new LollipopAssertionException(
						VALIDATION_ERROR_CODES.INVALID_SIGNATURE, "SAML signature verification failed");
			})()
		];
	
		// Esecuzione Validazioni Critiche
		// Se una fallisce, Promise.all() rigetta e l'errore viene lanciato
		await Promise.all(criticalValidationPromises);
		
		// 5 - Validazione FullName e popolamento risultato
		const fullName = await validateFullNameHeader(assertionDoc);

		result.name = fullName.name; 
		result.familyName = fullName.familyName;
		result.resultCode = "ASSERTION_VERIFICATION_SUCCESS";
		result.resultMessage = "Name and surname successfully validated";
		
		console.log("Ending validateLollipopAssertion - Success");
        return result;

	}catch(error){
		console.error("Lollipop Request Assertion Validation failed:", error.name, " - Message:", error.message);
		if (error instanceof LollipopAssertionException) {
            throw error;
        }
        throw new LollipopAssertionException(error.errorCode || VALIDATION_ERROR_CODES.GENERIC_ERROR, error.message);
		//if (error instanceof ErrorRetrievingIdpCertDataException){
		//	throw new LollipopAssertionException(error.errorCode, error.message);
		//}
		//throw error;
	}
}

module.exports = {
    validateLollipopAssertion,
};
