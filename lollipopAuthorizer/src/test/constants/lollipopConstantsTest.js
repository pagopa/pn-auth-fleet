const EC_JWK = {
  kty: "EC",
  crv: "P-256",
  x: "FqFDuwEgu4MUXERPMVL-85pGv2D3YmL4J1gfMkdbc24",
  y: "hdV0oxmWFSxMoJUDpdihr76rS8VRBEqMFebYyAfK9-k",
  alg: "ES256"

};

const VALID_JWK = {
               kty: "EC",
               crv: "P-256",
               x: "SVqB4JcUD6lsfvqMr-OKUNUphdNn64Eay60978ZlL74",
               y: "lf0u0pMj4lGAzZix5u4Cm5CMQIgMNpkwy163wtKYVKI"
            };

const NOT_VALID_JWK  = {
            kty: "ECX",   ///not supported
            crv: "P-256",
            x: "SVqB4JcUD6lsfvqMr-OKUNUphdNn64Eay60978ZlL74",
            y: "lf0u0pMj4lGAzZix5u4Cm5CMQIgMNpkwy163wtKYVKI"
         };

const RSA_JWK = {
  alg: "RS256",
  e: "AQAB",
  kty: "RSA",
  n: "16664736175603627996319962836030881026179675012391119517975514948152431214653585662880486636564539745534321011181408561816254231231298259205135081219875827651147217038442994953270212442857910417611387549687536933145745249602198835932059392377695498325446146715840517338191125529557810596070318285357964276748438650077150378696894010172596714187128214451872453277619054588751139432194135913672107689362828514055714059473608142304229480488308405791341245363647711560656764853819020066812645413910427819478301754525254844345246642430554339909098721902422359723272095429198014557278590405542226255562568066559844209030611"
};

// costanti utili ai test (fittizie)
const VALIDATION_PARAMS = {
  PUBLIC_KEY_HEADER: "x-pagopa-lollipop-public-key",
  ASSERTION_REF_HEADER: "x-pagopa-lollipop-assertion-ref",
  VALID_ASSERTION_REF_SHA256: "sha256-a7qE0Y0DyqeOFFREIQSLKfu5WlbckdxVXKsFasfcI-Dg",
  VALID_ASSERTION_REF_SHA384: "sha384-a7qE0Y0DyqeOFFREIQSLKfu5WlbckdxVXKsFasfcIhGBHtygYgftrfvUUbhitgS-Dg",
  VALID_ASSERTION_REF_SHA512: "sha512-nX5CfUc5R-FoYKYZwvQMuc4Tt-heb7vHi_O-AMUSqHNVCw9kNaN2SVuN-DXtGXyUhrcVcQdCyY6FVzl_vyWXNA",
  INVALID_ASSERTION_REF_SHA: "sha256-invalid@@@",
  VALID_ASSERTION_TYPE:"SAML",
  INVALID_ASSERTION_TYPE:"INVALID",
  MISSING_ASSERTION_TYPE:null,
  VALID_FISCAL_CODE: "AAAAAA89S20I111X",
  VALID_JWT: "aValidJWT",
  VALID_ORIGINAL_URL: "https://api-app.io.pagopa.it/first-lollipop/sign",
  VALID_SIGNATURE_INPUT:
                "sig1=(\"content-digest\" \"x-pagopa-lollipop-original-method\""
                    + " \"x-pagopa-lollipop-original-url\");created=1678293988;nonce=\"aNonce\";alg=\"ecdsa-p256-sha256\";keyid=\"sha256-a7qE0Y0DyqeOFFREIQSLKfu5WlbckdxVXKFasfcI-Dg\"",
   VALID_SIGNATURE: "sig1=:lTuoRytp53GuUMOB4Rz1z97Y96gfSeEOm/xVpO39d3HR6lLAy4KYiGq+1hZ7nmRFBt2bASWEpen7ov5O4wU3kQ==:",
   VALID_SIGNATURE_INPUT_RSA:'sig1=("x-pagopa-lollipop-original-method" "x-pagopa-lollipop-original-url");created=1678293988;alg="rsa-v1_5-sha256";keyid="id"'
};

// Export VALID_JWT separately for backward compatibility
const VALID_JWT = VALIDATION_PARAMS.VALID_JWT;

const PUBLIC_KEY_HEADER = "x-pagopa-lollipop-public-key";



//una lista di coppie chiave-valore separate da virgole, dove:
//Chiave: Inizia con sig e cifre (sig[\d]+)
//Valore: È racchiuso tra due punti (:) e contiene caratteri Base64 ([A-Za-z0-9+/=]*)
const SIGNATURE_REGEXP = '^((sig[\\d]+)=:[A-Za-z0-9+/=]*:(, ?)?)+$';

const EXPECTED_FIRST_LC_ORIGINAL_METHOD = "POST";


const ORIGINAL_URL_REGEX = '^https://\\S+$';
const EXPECTED_FIRST_LC_ORIGINAL_URL = '^https://api-app.io.pagopa.it/first-lollipop/sign$';

const AssertionRefAlgorithms = {
  SHA256: { pattern: /^sha256-[A-Za-z0-9_-]{44}$/ },
  SHA384: { pattern: /^sha384-[A-Za-z0-9_-]{66}$/ },
  SHA512: { pattern: /^sha512-[A-Za-z0-9_-]{88}$/ },
};

const VALIDATION_AUTH_JWT = {
  VALID: "VALID_AUTH_JWT",
  EMPTY: "",
  MISSING: null,
}

const VALID_ASSERTION_XML =
            "<samlp:Response xmlns:samlp=\"urn:oasis:names:tc:SAML:2.0:protocol\" Version=\"2.0\""
                    + " ID=\"id_432ca7e6e3fb172b94de5944e6cc0716b08227e7\""
                    + " IssueInstant=\"2023-04-26T13:23:47Z\""
                    + " Destination=\"https://localhost:8000/assertionConsumerService\""
                    + " InResponseTo=\"sha256-chG21HBOK-wJp2hHuYPrx7tAII2UGWVF-IFo0crUOtw\">\n"
                    + "  <saml:Issuer xmlns:saml=\"urn:oasis:names:tc:SAML:2.0:assertion\""
                    + " xmlns:xs=\"http://www.w3.org/2001/XMLSchema\""
                    + " xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\""
                    + " Format=\"urn:oasis:names:tc:SAML:2.0:nameid-format:entity\""
                    + " NameQualifier=\"https://spid-testenv2:8088\">https://spid-testenv2:8088</saml:Issuer><ds:Signature"
                    + " xmlns:ds=\"http://www.w3.org/2000/09/xmldsig#\"><ds:SignedInfo><ds:CanonicalizationMethod"
                    + " Algorithm=\"http://www.w3.org/2001/10/xml-exc-c14n#\"/><ds:SignatureMethod"
                    + " Algorithm=\"http://www.w3.org/2001/04/xmldsig-more#rsa-sha256\"/><ds:Reference"
                    + " URI=\"#id_432ca7e6e3fb172b94de5944e6cc0716b08227e7\"><ds:Transforms><ds:Transform"
                    + " Algorithm=\"http://www.w3.org/2000/09/xmldsig#enveloped-signature\"/><ds:Transform"
                    + " Algorithm=\"http://www.w3.org/2001/10/xml-exc-c14n#\"/></ds:Transforms><ds:DigestMethod"
                    + " Algorithm=\"http://www.w3.org/2001/04/xmlenc#sha256\"/><ds:DigestValue>s/DqYePHC7eCXX5ncsiFYNLyKbzS6P5C8331H1b8e30=</ds:DigestValue></ds:Reference></ds:SignedInfo><ds:SignatureValue>WcasorooElvhmK0kxFUdBVCqyRYi0SCNGRSZZnC9Q2sZHOYGZbERe4/T8OSuRKbSrEivXIHRgNr8WskZTM2CiywfWChHfGvhERsLuPJE8oh9CR3eicX/eg0ynJqwx4IoYhTb2NOwqMFc66nnutMhG/Smdtjs4SFz0RQYYVeZ5Ho51iTHd94uBV9ZHXjqcvs3EitUsJ0Zg1Pkw352tt8y7niUcGjAd8nydI72S12sF5ePv05AunFp7vZpYbKqi62fQLORCn1ZP7WKFD75hL0bCvZaSRF285GkfSnLfe1S4tLff2SlTQWevOMU/wCkHJmQwHT1LMwcWRnMvv4V+vd1XQ==</ds:SignatureValue><ds:KeyInfo><ds:X509Data><ds:X509Certificate>MIIC7TCCAdWgAwIBAgIJAMbxPOoBth1LMA0GCSqGSIb3DQEBCwUAMA0xCzAJBgNV\n"
                    + "BAYTAklUMB4XDTE4MDkwNDE0MDAxM1oXDTE4MTAwNDE0MDAxM1owDTELMAkGA1UE\n"
                    + "BhMCSVQwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDJrW3y8Zd2jESP\n"
                    + "XGMRY04cHC4Qfo3302HEY1C6x1aDfW7aR/tXzNplfdw8ZtZugSSmHZBxVrR8aA08\n"
                    + "dUVbbtUw5qD0uAWKIeREqGfhM+J1STAMSI2/ZxA6t2fLmv8l1eRd1QGeRDm7yF9E\n"
                    + "EKGY9iUZD3LJf2mWdVBAzzYlG23M769k+9JuGZxuviNWMjojgYRiQFgzypUJJQz+\n"
                    + "Ihh3q7LMjjiQiiULVb9vnJg7UdU9Wf3xGRkxk6uiGP9SzWigSObUekYYQ4ZAI/sp\n"
                    + "ILywgDxVMMtv/eVniUFKLABtljn5cE9zltECahPbm7wIuMJpDDu5GYHGdYO0j+K7\n"
                    + "fhjvF2mzAgMBAAGjUDBOMB0GA1UdDgQWBBQEVmzA/L1/fd70ok+6xtDRF8A3HjAf\n"
                    + "BgNVHSMEGDAWgBQEVmzA/L1/fd70ok+6xtDRF8A3HjAMBgNVHRMEBTADAQH/MA0G\n"
                    + "CSqGSIb3DQEBCwUAA4IBAQCRMo4M4PqS0iLTTRWfikMF4hYMapcpmuna6p8aee7C\n"
                    + "wTjS5y7y18RLvKTi9l8OI0dVkgokH8fq8/o13vMw4feGxro1hMeUilRtH52funrW\n"
                    + "C+FgPrqk3o/8cZOnq+CqnFFDfILLiEb/PVJMddvTXgv2f9O6u17f8GmMLzde1yvY\n"
                    + "Da1fG/Pi0fG2F0yw/CmtP8OTLSvxjPtJ+ZckGzZa9GotwHsoVJ+Od21OU2lOeCnO\n"
                    + "jJOAbewHgqwkCB4O4AT5RM4ThAQtoU8QibjD1XDk/ZbEHdKcofnziDyl0V8gglP2\n"
                    + "SxpzDaPX0hm4wgHk9BOtSikb72tfOw+pNfeSrZEr6ItQ\n"
                    + "</ds:X509Certificate></ds:X509Data></ds:KeyInfo></ds:Signature>\n"
                    + "  <samlp:Status>\n"
                    + "    <samlp:StatusCode Value=\"urn:oasis:names:tc:SAML:2.0:status:Success\"/>\n"
                    + "  </samlp:Status>\n"
                    + "  <saml:Assertion xmlns:saml=\"urn:oasis:names:tc:SAML:2.0:assertion\""
                    + " xmlns:xs=\"http://www.w3.org/2001/XMLSchema\""
                    + " xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" Version=\"2.0\""
                    + " ID=\"id_451563f4726745384be4ab177e82c542baa99430\""
                    + " IssueInstant=\"2023-04-26T13:23:47Z\">\n"
                    + "    <saml:Issuer Format=\"urn:oasis:names:tc:SAML:2.0:nameid-format:entity\""
                    + " NameQualifier=\"https://spid-testenv2:8088\">https://spid-testenv2:8088</saml:Issuer><ds:Signature"
                    + " xmlns:ds=\"http://www.w3.org/2000/09/xmldsig#\"><ds:SignedInfo><ds:CanonicalizationMethod"
                    + " Algorithm=\"http://www.w3.org/2001/10/xml-exc-c14n#\"/><ds:SignatureMethod"
                    + " Algorithm=\"http://www.w3.org/2001/04/xmldsig-more#rsa-sha256\"/><ds:Reference"
                    + " URI=\"#id_451563f4726745384be4ab177e82c542baa99430\"><ds:Transforms><ds:Transform"
                    + " Algorithm=\"http://www.w3.org/2000/09/xmldsig#enveloped-signature\"/><ds:Transform"
                    + " Algorithm=\"http://www.w3.org/2001/10/xml-exc-c14n#\"/></ds:Transforms><ds:DigestMethod"
                    + " Algorithm=\"http://www.w3.org/2001/04/xmlenc#sha256\"/><ds:DigestValue>4cqgG29TSKgNLy2/1eFPXhd5WRVPxZBGcd8DgTvd5Fo=</ds:DigestValue></ds:Reference></ds:SignedInfo><ds:SignatureValue>WqxM+y+vtZDcEaIaw2WfcuMuwXUeTOY9ZjaXwzHw+RE8uUr5s8BE1tpaodcKmmqSJK1JQYNr8AUV+W9V79EKfmNtFvfaf0WYeUee7Td7E24QqiyVHjr1YgfDWhSdItFLYJfQUkotj2BepbdwVQGY5yN0Rw6Fq98hgNOgsxty7g6oqxG1OXB4WJ2He20iOoYWQl8ApxlbU//hwnefFYe9ghDPy3rDbcNl3JetT07NR/+AzhKH4e+JCwKjTkdCBTW30fK4eiV9yBk74Lobip4hMaQhMaByl8egaU3A8AsnsZQuov2B6Wo2sDiQPjIulb8K3DOwFyL8PzEk8BB5YoAfwg==</ds:SignatureValue><ds:KeyInfo><ds:X509Data><ds:X509Certificate>MIIC7TCCAdWgAwIBAgIJAMbxPOoBth1LMA0GCSqGSIb3DQEBCwUAMA0xCzAJBgNV\n"
                    + "BAYTAklUMB4XDTE4MDkwNDE0MDAxM1oXDTE4MTAwNDE0MDAxM1owDTELMAkGA1UE\n"
                    + "BhMCSVQwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDJrW3y8Zd2jESP\n"
                    + "XGMRY04cHC4Qfo3302HEY1C6x1aDfW7aR/tXzNplfdw8ZtZugSSmHZBxVrR8aA08\n"
                    + "dUVbbtUw5qD0uAWKIeREqGfhM+J1STAMSI2/ZxA6t2fLmv8l1eRd1QGeRDm7yF9E\n"
                    + "EKGY9iUZD3LJf2mWdVBAzzYlG23M769k+9JuGZxuviNWMjojgYRiQFgzypUJJQz+\n"
                    + "Ihh3q7LMjjiQiiULVb9vnJg7UdU9Wf3xGRkxk6uiGP9SzWigSObUekYYQ4ZAI/sp\n"
                    + "ILywgDxVMMtv/eVniUFKLABtljn5cE9zltECahPbm7wIuMJpDDu5GYHGdYO0j+K7\n"
                    + "fhjvF2mzAgMBAAGjUDBOMB0GA1UdDgQWBBQEVmzA/L1/fd70ok+6xtDRF8A3HjAf\n"
                    + "BgNVHSMEGDAWgBQEVmzA/L1/fd70ok+6xtDRF8A3HjAMBgNVHRMEBTADAQH/MA0G\n"
                    + "CSqGSIb3DQEBCwUAA4IBAQCRMo4M4PqS0iLTTRWfikMF4hYMapcpmuna6p8aee7C\n"
                    + "wTjS5y7y18RLvKTi9l8OI0dVkgokH8fq8/o13vMw4feGxro1hMeUilRtH52funrW\n"
                    + "C+FgPrqk3o/8cZOnq+CqnFFDfILLiEb/PVJMddvTXgv2f9O6u17f8GmMLzde1yvY\n"
                    + "Da1fG/Pi0fG2F0yw/CmtP8OTLSvxjPtJ+ZckGzZa9GotwHsoVJ+Od21OU2lOeCnO\n"
                    + "jJOAbewHgqwkCB4O4AT5RM4ThAQtoU8QibjD1XDk/ZbEHdKcofnziDyl0V8gglP2\n"
                    + "SxpzDaPX0hm4wgHk9BOtSikb72tfOw+pNfeSrZEr6ItQ\n"
                    + "</ds:X509Certificate></ds:X509Data></ds:KeyInfo></ds:Signature>\n"
                    + "    <saml:Subject>\n"
                    + "      <saml:NameID"
                    + " Format=\"urn:oasis:names:tc:SAML:2.0:nameid-format:transient\""
                    + " NameQualifier=\"https://spid-testenv2:8088\">id_48129c2a9d5e9077422591baf495747cfda668c5</saml:NameID>\n"
                    + "      <saml:SubjectConfirmation"
                    + " Method=\"urn:oasis:names:tc:SAML:2.0:cm:bearer\">\n"
                    + "        <saml:SubjectConfirmationData"
                    + " Recipient=\"https://localhost:8000/assertionConsumerService\""
                    + " NotOnOrAfter=\"2023-04-26T13:25:47Z\""
                    + " InResponseTo=\"sha256-chG21HBOK-wJp2hHuYPrx7tAII2UGWVF-IFo0crUOtw\"/>\n"
                    + "      </saml:SubjectConfirmation>\n"
                    + "    </saml:Subject>\n"
                    + "    <saml:Conditions NotBefore=\"2023-04-26T13:21:47Z\""
                    + " NotOnOrAfter=\"2023-04-26T13:25:47Z\">\n"
                    + "      <saml:AudienceRestriction>\n"
                    + "        <saml:Audience>https://spid.agid.gov.it/cd</saml:Audience>\n"
                    + "      </saml:AudienceRestriction>\n"
                    + "    </saml:Conditions>\n"
                    + "    <saml:AuthnStatement AuthnInstant=\"2023-04-26T13:23:47Z\""
                    + " SessionIndex=\"id_2086da5272d65361b188f3bb66b9eacaf9c2e219\">\n"
                    + "      <saml:AuthnContext>\n"
                    + "       "
                    + " <saml:AuthnContextClassRef>https://www.spid.gov.it/SpidL2</saml:AuthnContextClassRef>\n"
                    + "      </saml:AuthnContext>\n"
                    + "    </saml:AuthnStatement>\n"
                    + "    <saml:AttributeStatement>\n"
                    + "      <saml:Attribute Name=\"email\">\n"
                    + "        <saml:AttributeValue"
                    + " xsi:type=\"xs:string\">info@agid.gov.it</saml:AttributeValue>\n"
                    + "      </saml:Attribute>\n"
                    + "      <saml:Attribute Name=\"name\">\n"
                    + "        <saml:AttributeValue"
                    + " xsi:type=\"xs:string\">Mario</saml:AttributeValue>\n"
                    + "      </saml:Attribute>\n"
                    + "      <saml:Attribute Name=\"familyName\">\n"
                    + "        <saml:AttributeValue"
                    + " xsi:type=\"xs:string\">Bianchi</saml:AttributeValue>\n"
                    + "      </saml:Attribute>\n"
                    + "      <saml:Attribute Name=\"fiscalNumber\">\n"
                    + "        <saml:AttributeValue"
                    + " xsi:type=\"xs:string\">GDNNWA12H81Y874F</saml:AttributeValue>\n"
                    + "      </saml:Attribute>\n"
                    + "      <saml:Attribute Name=\"dateOfBirth\">\n"
                    + "        <saml:AttributeValue"
                    + " xsi:type=\"xs:date\">1991-12-12</saml:AttributeValue>\n"
                    + "      </saml:Attribute>\n"
                    + "    </saml:AttributeStatement>\n"
                    + "  </saml:Assertion>\n"
                    + "</samlp:Response>";

        const VALID_IDP_CERTIFICATE =
              "MIIC7TCCAdWgAwIBAgIJAMbxPOoBth1LMA0GCSqGSIb3DQEBCwUAMA0xCzAJBgNV" +
              "BAYTAklUMB4XDTE4MDkwNDE0MDAxM1oXDTE4MTAwNDE0MDAxM1owDTELMAkGA1UE" +
              "BhMCSVQwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDJrW3y8Zd2jESP" +
              "XGMRY04cHC4Qfo3302HEY1C6x1aDfW7aR/tXzNplfdw8ZtZugSSmHZBxVrR8aA08" +
              "dUVbbtUw5qD0uAWKIeREqGfhM+J1STAMSI2/ZxA6t2fLmv8l1eRd1QGeRDm7yF9E" +
              "EKGY9iUZD3LJf2mWdVBAzzYlG23M769k+9JuGZxuviNWMjojgYRiQFgzypUJJQz+" +
              "Ihh3q7LMjjiQiiULVb9vnJg7UdU9Wf3xGRkxk6uiGP9SzWigSObUekYYQ4ZAI/sp" +
              "ILywgDxVMMtv/eVniUFKLABtljn5cE9zltECahPbm7wIuMJpDDu5GYHGdYO0j+K7" +
              "fhjvF2mzAgMBAAGjUDBOMB0GA1UdDgQWBBQEVmzA/L1/fd70ok+6xtDRF8A3HjAf" +
              "BgNVHSMEGDAWgBQEVmzA/L1/fd70ok+6xtDRF8A3HjAMBgNVHRMEBTADAQH/MA0G" +
              "CSqGSIb3DQEBCwUAA4IBAQCRMo4M4PqS0iLTTRWfikMF4hYMapcpmuna6p8aee7C" +
              "wTjS5y7y18RLvKTi9l8OI0dVkgokH8fq8/o13vMw4feGxro1hMeUilRtH52funrW" +
              "C+FgPrqk3o/8cZOnq+CqnFFDfILLiEb/PVJMddvTXgv2f9O6u17f8GmMLzde1yvY" +
              "Da1fG/Pi0fG2F0yw/CmtP8OTLSvxjPtJ+ZckGzZa9GotwHsoVJ+Od21OU2lOeCnO" +
              "jJOAbewHgqwkCB4O4AT5RM4ThAQtoU8QibjD1XDk/ZbEHdKcofnziDyl0V8gglP2" +
              "SxpzDaPX0hm4wgHk9BOtSikb72tfOw+pNfeSrZEr6ItQ";

        const ASSERTION_XML_WITH_VALID_INRESPONSETO_SHA384_ALGORITHM =
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?><saml2p:Response"
                + " xmlns:saml2p=\"urn:oasis:names:tc:SAML:2.0:protocol\""
                + " Destination=\"https://app-backend.io.italia.it/assertionConsumerService\""
                + " ID=\"_de2ce675-f1e5-46fc-96ed-019803471175\""
                + " InResponseTo=\"sha384-lqxC_2kqMdwiBWoD-Us63Fha6e3bE1Y3yUz8G6IJTldohJCIBVDfvS8acB3GJBhw\""
                + " IssueInstant=\"2023-02-28T16:27:26.400Z\" Version=\"2.0\">   <saml2:Assertion"
                + " xmlns:saml2=\"urn:oasis:names:tc:SAML:2.0:assertion\""
                + " ID=\"_6b9580aa-08b1-4f19-8fb6-8b670d070bad\""
                + " IssueInstant=\"2023-02-28T16:27:25.400Z\" Version=\"2.0\">\t\t<saml2:Subject>\t"
                + "\t\t<saml2:NameID Format=\"urn:oasis:names:tc:SAML:2.0:nameid-format:transient\""
                + " NameQualifier=\"https://posteid.poste.it\">SPID-d4de186b-e103-4b39-8209-0bccc7b1acdd</saml2:NameID>"
                + "\t\t\t<saml2:SubjectConfirmation"
                + " Method=\"urn:oasis:names:tc:SAML:2.0:cm:bearer\">\t\t\t"
                + "\t<saml2:SubjectConfirmationData"
                + " InResponseTo=\"sha384-lqxC_2kqMdwiBWoD-Us63Fha6e3bE1Y3yUz8G6IJTldohJCIBVDfvS8acB3GJBhw\""
                + " NotOnOrAfter=\"2023-02-28T16:28:25.400Z\""
                + " Recipient=\"https://app-backend.io.italia.it/assertionConsumerService\" />\t\t"
                + "\t</saml2:SubjectConfirmation>\t\t</saml2:Subject>\t\t<saml2:Conditions"
                + " NotBefore=\"2023-02-28T16:27:25.400Z\""
                + " NotOnOrAfter=\"2023-02-28T16:28:25.400Z\">\t\t\t<saml2:AudienceRestriction>\t\t"
                + "\t\t<saml2:Audience>https://app-backend.io.italia.it</saml2:Audience>\t\t"
                + "\t</saml2:AudienceRestriction>\t\t</saml2:Conditions>\t"
                + "\t<saml2:AttributeStatement>\t\t\t<saml2:Attribute FriendlyName=\"Codice"
                + " fiscale\" Name=\"fiscalNumber\">\t\t\t\t<saml2:AttributeValue"
                + " xmlns:xs=\"http://www.w3.org/2001/XMLSchema\""
                + " xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\""
                + " xsi:type=\"xs:string\">TINIT-AAAAAA89S20I111X</saml2:AttributeValue>\t\t"
                + "\t</saml2:Attribute>\t\t</saml2:AttributeStatement>"
                + "\t</saml2:Assertion></saml2p:Response>";


    const ASSERTION_XML_WITH_VALID_INRESPONSETO_SHA512_ALGORITHM =
                      "<?xml version=\"1.0\" encoding=\"UTF-8\"?><saml2p:Response"
                          + " xmlns:saml2p=\"urn:oasis:names:tc:SAML:2.0:protocol\""
                          + " Destination=\"https://app-backend.io.italia.it/assertionConsumerService\""
                          + " ID=\"_de2ce675-f1e5-46fc-96ed-019803471175\""
                          + " InResponseTo=\"sha512-nX5CfUc5R-FoYKYZwvQMuc4Tt-heb7vHi_O-AMUSqHNVCw9kNaN2SVuN-DXtGXyUhrcVcQdCyY6FVzl_vyWXNA\""
                          + " IssueInstant=\"2023-02-28T16:27:26.400Z\" Version=\"2.0\">   <saml2:Assertion"
                          + " xmlns:saml2=\"urn:oasis:names:tc:SAML:2.0:assertion\""
                          + " ID=\"_6b9580aa-08b1-4f19-8fb6-8b670d070bad\""
                          + " IssueInstant=\"2023-02-28T16:27:25.400Z\" Version=\"2.0\">\t\t<saml2:Subject>\t"
                          + "\t\t<saml2:NameID Format=\"urn:oasis:names:tc:SAML:2.0:nameid-format:transient\""
                          + " NameQualifier=\"https://posteid.poste.it\">SPID-d4de186b-e103-4b39-8209-0bccc7b1acdd</saml2:NameID>"
                          + "\t\t\t<saml2:SubjectConfirmation"
                          + " Method=\"urn:oasis:names:tc:SAML:2.0:cm:bearer\">\t\t\t"
                          + "\t<saml2:SubjectConfirmationData"
                          + " InResponseTo=\"sha512-nX5CfUc5R-FoYKYZwvQMuc4Tt-heb7vHi_O-AMUSqHNVCw9kNaN2SVuN-DXtGXyUhrcVcQdCyY6FVzl_vyWXNA\""
                          + " NotOnOrAfter=\"2023-02-28T16:28:25.400Z\""
                          + " Recipient=\"https://app-backend.io.italia.it/assertionConsumerService\" />\t\t"
                          + "\t</saml2:SubjectConfirmation>\t\t</saml2:Subject>\t\t<saml2:Conditions"
                          + " NotBefore=\"2023-02-28T16:27:25.400Z\""
                          + " NotOnOrAfter=\"2023-02-28T16:28:25.400Z\">\t\t\t<saml2:AudienceRestriction>\t\t"
                          + "\t\t<saml2:Audience>https://app-backend.io.italia.it</saml2:Audience>\t\t"
                          + "\t</saml2:AudienceRestriction>\t\t</saml2:Conditions>\t"
                          + "\t<saml2:AttributeStatement>\t\t\t<saml2:Attribute FriendlyName=\"Codice"
                          + " fiscale\" Name=\"fiscalNumber\">\t\t\t\t<saml2:AttributeValue"
                          + " xmlns:xs=\"http://www.w3.org/2001/XMLSchema\""
                          + " xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\""
                          + " xsi:type=\"xs:string\">TINIT-AAAAAA89S20I111X</saml2:AttributeValue>\t\t"
                          + "\t</saml2:Attribute>\t\t</saml2:AttributeStatement>"
                          + "\t</saml2:Assertion></saml2p:Response>";

        const ASSERTION_XML_WITHOUT_ATTRIBUTE_TAG =
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?><saml2p:Response"
                + " xmlns:saml2p=\"urn:oasis:names:tc:SAML:2.0:protocol\""
                + " Destination=\"https://app-backend.io.italia.it/assertionConsumerService\""
                + " ID=\"_de2ce675-f1e5-46fc-96ed-019803471175\""
                + " InResponseTo=\"sha256-a7qE0Y0DyqeOFFREIQSLKfu5WlbckdxVXKFasfcI-Dg\""
                + " IssueInstant=\"2023-02-28T16:27:26.400Z\" Version=\"2.0\"><saml2:Assertion"
                + " xmlns:saml2=\"urn:oasis:names:tc:SAML:2.0:assertion\""
                + " ID=\"_6b9580aa-08b1-4f19-8fb6-8b670d070bad\""
                + " IssueInstant=\"2023-02-28T16:27:25.400Z\" Version=\"2.0\"><saml2:Conditions"
                + " NotBefore=\"2023-02-28T16:27:25.400Z\""
                + " NotOnOrAfter=\"2023-02-28T16:28:25.400Z\"><saml2:AudienceRestriction><saml2:Audience>https://app-backend.io.italia.it</saml2:Audience></saml2:AudienceRestriction></saml2:Conditions></saml2:Assertion></saml2p:Response>";



const lollipopConfig = {
  publicKeyHeader: "x-pagopa-lollipop-public-key",
  signatureHeader: "Signature",
  signatureInputHeader: "Signature-Input",
};

const DEAFULT_ALG_BY_KTY = {
  EC: 'ES256',
  RSA: 'RS256',
};



//validare una lista di coppie chiave-valore separate da virgole:
//Inizia esattamente con sig seguito da uno o più cifre, seguito da '=' seguito da qualsiasi sequenza di caratteri tranne la virgola
//Separatore tra Coppie: Una virgola opzionale seguita da uno spazio opzionale ((, ?+)?+).
const SIGNATURE_INPUT_REGEXP = '^(((sig[\\d]+)=[^,]*)(, ?)?)+$';


export { EC_JWK,
  RSA_JWK,
  PUBLIC_KEY_HEADER,
  VALIDATION_PARAMS,
  VALID_JWT,
  AssertionRefAlgorithms,
  VALIDATION_AUTH_JWT,
  EXPECTED_FIRST_LC_ORIGINAL_METHOD,
  ORIGINAL_URL_REGEX,
  EXPECTED_FIRST_LC_ORIGINAL_URL,
  SIGNATURE_INPUT_REGEXP,
  SIGNATURE_REGEXP,
  lollipopConfig,
  DEAFULT_ALG_BY_KTY,
  VALID_ASSERTION_XML,
  VALID_IDP_CERTIFICATE,
  VALID_JWK, NOT_VALID_JWK,
  ASSERTION_XML_WITHOUT_ATTRIBUTE_TAG,
  ASSERTION_XML_WITH_VALID_INRESPONSETO_SHA384_ALGORITHM,
  ASSERTION_XML_WITH_VALID_INRESPONSETO_SHA512_ALGORITHM };
