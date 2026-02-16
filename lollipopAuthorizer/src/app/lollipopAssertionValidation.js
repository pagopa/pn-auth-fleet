import { getAssertionDoc,
	validateAssertionPeriod,
	validateUserId,
	validateInResponseTo,
	getIdpCertDataAssertion,
	validateSignatureAssertion,
	validateFullNameHeader
 } from "./assertionValidation.js";

import CommandResult from "./model/CommandResult.js";
import { lollipopConfig  } from "../app/config/lollipopConsumerRequestConfig.js";
import { VALIDATION_ERROR_CODES  } from "../app/constants/lollipopErrorsConstants.js";
import LollipopAssertionException from "../app/exception/lollipopAssertionException.js";

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
		const idpCertDataList = await getIdpCertDataAssertion( assertionDoc);
		if(!idpCertDataList){
			console.error("Some error occurred in retrieving certification data from IDP");
			throw new LollipopAssertionException(VALIDATION_ERROR_CODES.IDP_CERT_DATA_NOT_FOUND, "Some error occurred in retrieving certification data from IDP");
		}

		//Validazioni asincrone in parallelo - array di funzioni (non ancora eseguite)
        const validations = [
            () => validateAssertionPeriod(assertionDoc)
                .then(isValid => {
                    if (!isValid) throw new LollipopAssertionException(VALIDATION_ERROR_CODES.INVALID_ASSERTION_PERIOD, "The assertion has expired");
                }),

            () => validateUserId(request, assertionDoc)
                .then(isValid => {
                    if (!isValid) throw new LollipopAssertionException(VALIDATION_ERROR_CODES.INVALID_USER_ID, "The user id in the assertion does not match the request header");
                }),

            () => validateInResponseTo(request, assertionDoc)
                .then(isValid => {
                    if (!isValid) throw new LollipopAssertionException(VALIDATION_ERROR_CODES.INVALID_IN_RESPONSE_TO, "The hash of provided public key do not match the InResponseTo in the assertion");
                }),

            () => validateSignatureAssertion(assertionDoc, idpCertDataList)
                .then(isValid => {
                    if (!isValid) throw new LollipopAssertionException(VALIDATION_ERROR_CODES.MISSING_ASSERTION_SIGNATURE, "The assetion signature is not valid");
                })
        ];

        // Esecuzione in parallelo
        try {
            await Promise.all(validations.map(fn => fn()));
        } catch (error) {
            console.error("Validazione fallita - ErrorCode: ", error.errorCode, " - Message: ", error.message);
            throw error; // Rilancia per il chiamante superiore
        }

		// 5 - Validazione FullName e popolamento risultato
		const fullName = await validateFullNameHeader(assertionDoc);

		result.name = fullName.name; 
		result.familyName = fullName.familyName;
		result.resultCode = "VERIFICATION_SUCCESS_CODE";
		result.resultMessage = "Name and surname successfully validated";
		
		console.log("Ending validateLollipopAssertion - Success");
        return result;

	}catch(error){
		console.error("Lollipop Request Assertion Validation failed:", error.name, " - Message:", error.message);
		if (error instanceof LollipopAssertionException) {
            throw error;
        }
        throw new LollipopAssertionException(error.errorCode || VALIDATION_ERROR_CODES.GENERIC_ERROR, error.message);
	}
}

export { validateLollipopAssertion, };
