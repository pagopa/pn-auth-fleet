const jsonwebtoken = require("jsonwebtoken");

const ValidationException = require("./exception/validationException.js");
const { getPublicKey } = require("./publicKeyGetter.js");
const utils = require("./utils");

async function validation(authorizationToken) {
  const decodedTokenPayload = await jwtValidator(authorizationToken);
  console.info("token is valid");
  return decodedTokenPayload;
}

async function jwtValidator(jwtToken) {
  console.debug("Start jwtValidator");
  const decodedToken = jsonwebtoken.decode(jwtToken, { complete: true });

  if (!decodedToken) {
    console.warn("decoded token is null, token is not valid");
    throw new ValidationException("Token is not valid");
  }

  const sensitiveFields = ["email", "family_name", "fiscal_number", "name"];
  const decodedTokenMaskedPayload = utils.copyAndMaskObject(
    decodedToken.payload,
    sensitiveFields
  );
  const decodedTokenMasked = {
    header: decodedToken.header,
    payload: decodedTokenMaskedPayload,
    signature: decodedToken.signature,
  };
  console.debug("decoded_token", decodedTokenMasked);

  const tokenPayload = decodedToken.payload;
  const { iss: issuer, aud, fiscal_number: fiscalNumber } = tokenPayload;
  const { alg, kid } = decodedToken.header;
  const role = tokenPayload.organization?.roles[0]?.role.replace(/pg-/, "");

  if (alg !== "RS256") {
    console.warn("Invalid algorithm=%s", alg);
    throw new ValidationException("Invalid algorithm");
  }

  if (checkAudience(aud) === -1) {
    console.warn("Audience=%s not known", aud);
    throw new ValidationException("Invalid Audience");
  }

  if (checkIssuer(issuer) === -1) {
    console.warn("Issuer=%s not known", issuer);
    throw new ValidationException("Issuer not known");
  }

  if (tokenPayload.organization && checkRoles(role) === -1) {
    console.warn("Role=%s not allowed", role);
    throw new ValidationException("Role not allowed");
  }

  if ((await checkTaxIdCode(fiscalNumber)) === -1) {
    console.warn("TaxId=%s not allowed", fiscalNumber);
    throw new ValidationException("TaxId not allowed");
  }

  console.debug("kid from header", kid);
  try {
    const keyInPemFormat = await getPublicKey(issuer, kid);
    jsonwebtoken.verify(jwtToken, keyInPemFormat);
  } catch (err) {
    console.warn("Validation error ", err);
    throw new ValidationException(err.message);
  }

  console.debug("success!");
  console.debug("payload", decodedTokenMaskedPayload);
  return tokenPayload;
}

function checkIssuer(iss) {
  const allowedIssuers = process.env.ALLOWED_ISSUER.split(",");
  if (allowedIssuers.length === 0) {
    console.error("Invalid env vars ALLOWED_ISSUER ", process.env.ALLOWED_ISSUER);
    return -1;
  }
  return allowedIssuers.indexOf(iss);
}

function checkAudience(aud) {
  const allowedAudiences = process.env.ACCEPTED_AUDIENCE.split(",");
  if (allowedAudiences.length === 0) {
    console.error("Invalid env vars ACCEPTED_AUDIENCE", process.env.ACCEPTED_AUDIENCE);
    return -1;
  }
  return allowedAudiences.indexOf(aud);
}

async function checkTaxIdCode(taxIdCode) {
  if (!process.env.ALLOWED_TAXIDS_PARAMETER) {
    return 0;
  }

  try {
    const allowedTaxIdsFromStore = await utils.getParameterFromStore(
      process.env.ALLOWED_TAXIDS_PARAMETER
    );
    if (allowedTaxIdsFromStore.length === 0) {
      return 0;
    }

    const allowedTaxIds = allowedTaxIdsFromStore.split(",");
    if (allowedTaxIds.includes(`!${taxIdCode}`)) {
      return -1;
    }

    return allowedTaxIds.includes("*") ? 0 : allowedTaxIds.indexOf(taxIdCode);
  } catch (e) {
    console.log(e);
    return -1;
  }
}

function checkRoles(role) {
  const allowedRoles = ["admin", "operator"];
  if (allowedRoles.length === 0) {
    console.error("Invalid env vars ALLOWED_ROLES", process.env.ALLOWED_ROLES);
    return -1;
  }
  return allowedRoles.indexOf(role);
}

module.exports = { validation };
