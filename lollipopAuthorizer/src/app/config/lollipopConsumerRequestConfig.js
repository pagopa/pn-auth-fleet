// config come LollipopConsumerRequestConfig sdk
import {
    SecretsManagerClient,
    GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";


const lollipopConfig = {
    signatureHeader: "signature",
    signatureInputHeader: "signature-input",
    publicKeyHeader: "x-pagopa-lollipop-public-key",
    assertionRefHeader: "x-pagopa-lollipop-assertion-ref",
    assertionTypeHeader: "x-pagopa-lollipop-assertion-type",
    originalMethodHeader: "x-pagopa-lollipop-original-method",
    originalURLHeader: "x-pagopa-lollipop-original-url",
    authJWTHeader: "x-pagopa-lollipop-auth-jwt",
    userGivenNameHeader: "x-pagopa-lollipop-user-name",
    userFamilyNameHeader: "x-pagopa-lollipop-user-family-name",
    userIdHeader: "x-pagopa-lollipop-user-id",
    expectedFirstLcOriginalUrl: "^https://api-app.io.pagopa.it/\\S+$",
    expectedFirstLcOriginalMethod: "POST;GET",
    samlNamespaceAssertion: "urn:oasis:names:tc:SAML:2.0:assertion",
    assertionTag: "Assertion",
    assertionNotBeforeTag: "Conditions",
    notBeforeAttribute: "NotBefore",
    assertionAttributeTag: "Attribute",
    assertionExpireInDays: 365,
    ISSUE_INSTANT: "IssueInstant",
    ISSUER_ENTITY_ID_TAG: "Issuer",
    ENTITIES_DESCRIPTOR_TAG: "EntitiesDescriptor",
    NAMESPACE_TAG: "md:",
    ENTITY_DESCRIPTOR_TAG: "EntityDescriptor",
    IDPSSO_DESCRIPTOR_TAG: "IDPSSODescriptor",
    KEY_DESCRIPTOR_TAG: "KeyDescriptor",
    DS_KEYINFO_TAG: "ds:KeyInfo",
    DS_X509DATA_TAG: "ds:X509Data",
    DS_X509CERTIFICATE_TAG: "ds:X509Certificate",
    assertionInResponseToTag: "SubjectConfirmationData",
    inResponseToAttribute: "InResponseTo",
    assertionInstantTag: "Assertion",
    samlNamespaceSignature:'http://www.w3.org/2000/09/xmldsig#',
    signatureTag:"Signature",
    lollipopBlock:"false"
};

const IDP_PROVIDER_CONFIG = {
    CIE_ENTITY_ID: [ "https://idserver.servizicie.interno.gov.it/idp/profile/SAML2/POST/SSO" ],
    BASE_URI: "https://api.is.eng.pagopa.it",
    IDP_KEYS_CIE_ENDPOINT: "/idp-keys/cie",
    IDP_KEYS_SPID_ENDPOINT: "/idp-keys/spid",
    TIMEOUT_API: 60000, // READ_TIMEOUT_MS,
    CONNECTION_TIMEOUT_API: 60000, //CONNECTION_TIMEOUT_MS,
}

const ASSERTION_PROVIDER_CONFIG = {
    BASE_URI: "https://api.is.eng.pagopa.it",
    ASSERTION_REQUEST_ENDPOINT: "/assertions",
    SUBSCRIPTION_KEY: "",
}


async function getSubscriptionKey(){
    console.info("[TESTUAT] Starting getSubscriptionKey")

    const secret_name =  process.env.LOLLIPOP_SECRETS_KEY;
    console.info("[TESTUAT] Secret_name: ",secret_name)

    const client = new SecretsManagerClient();

    let response;

    try {
        response = await client.send(
            new GetSecretValueCommand({
                SecretId: secret_name,
                VersionStage: "AWSCURRENT", // VersionStage defaults to AWSCURRENT if unspecified
            })
        );
    } catch (error) {
        // For a list of exceptions thrown, see
        // https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
        console.error("[TESTUAT] error retrieving secret: ",error);throw error;
    }

    const secretString = response.SecretString;
    console.info("[TESTUAT] raw secret: ", secretString)
    if (secretString === null || secretString === undefined){
        console.info("[TESTUAT] returning empty secret")
        return ""
    }

    const secretObj = JSON.parse(secretString);
    return secretObj.AssertionRestSubscriptionKey ?? "";
}


function loadAuthorizerConfigMap() {
    const configEnv = process.env.LOLLIPOP_AUTHORIZER_CONFIG;

    if (!configEnv || configEnv.trim() === '') {
        console.warn('[loadAuthorizerConfigMap] LOLLIPOP_AUTHORIZER_CONFIG non definita, uso configurazione globale');
        return null;
    }

    try {
        const configArray = JSON.parse(configEnv);

        if (!Array.isArray(configArray)) {
            console.error('[loadAuthorizerConfigMap] LOLLIPOP_AUTHORIZER_CONFIG non è un array valido');
            return null;
        }

        for (let i = 0; i < configArray.length; i++) {
            const entry = configArray[i];

            if (!entry.substringURL || typeof entry.substringURL !== 'string') {
                console.error(`[loadAuthorizerConfigMap] Entry ${i}: substringURL mancante o non valida`);
                return null;
            }

            if (!Array.isArray(entry.methods) || entry.methods.length === 0) {
                console.error(`[loadAuthorizerConfigMap] Entry ${i}: methods deve essere un array non vuoto`);
                return null;
            }

            if (!entry.URLpattern || typeof entry.URLpattern !== 'string') {
                console.error(`[loadAuthorizerConfigMap] Entry ${i}: URLpattern mancante o non valida`);
                return null;
            }

            try {
                new RegExp(entry.URLpattern);
            } catch (e) {
                console.error(`[loadAuthorizerConfigMap] Entry ${i}: URLpattern non è un regex valido - ${e.message}`);
                return null;
            }
        }

        console.log('[loadAuthorizerConfigMap] Configurazione caricata con successo:',
            `${configArray.length} microservizi configurati`);
        return configArray;

    } catch (error) {
        console.error('[loadAuthorizerConfigMap] Errore nel parsing di LOLLIPOP_AUTHORIZER_CONFIG:', error.message);
        return null;
    }
}

const authorizerConfigMap = loadAuthorizerConfigMap();
if (process.env.NODE_ENV !== "test") {
    ASSERTION_PROVIDER_CONFIG.SUBSCRIPTION_KEY =
        (await getSubscriptionKey().catch(() => "")) || "";
}

export { lollipopConfig, IDP_PROVIDER_CONFIG, ASSERTION_PROVIDER_CONFIG, authorizerConfigMap, loadAuthorizerConfigMap };