const jsonwebtoken = require("jsonwebtoken");

const ValidationException = require("./exception/validationException.js");
const { getPublicKey } = require("./publicKeyGetter.js");
// for testing purpose, we mustn't destructure the import; stub doesn't mock destructured object
const utils = require("./utils");

async function validation(authorizationToken) {
  const decodedTokenPayload = await jwtValidator(authorizationToken);
  console.info("token is valid");
  return decodedTokenPayload;
}

async function jwtValidator(jwtToken) {
  console.debug("Start jwtValidator");
  const decodedToken = jsonwebtoken.decode(jwtToken, { complete: true });

  if (decodedToken) {
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
    const issuer = tokenPayload.iss;
    const aud = tokenPayload.aud;
    const alg = decodedToken.header.alg;
    const organization = tokenPayload.organization;
    const role = tokenPayload.organization?.roles[0]?.role.replace(/pg-/, "");
    const fiscalNumber = tokenPayload.fiscal_number;

    if (alg !== "RS256") {
      console.warn("Invalid algorithm=%s", alg);
      throw new ValidationException("Invalid algorithm");
    }
    if (checkAudience(aud) !== -1) {
      if (checkIssuer(issuer) !== -1) {
        if (organization === undefined || checkRoles(role) !== -1) {
          // check if fiscal code is in white list
          if ((await checkTaxIdCode(fiscalNumber)) !== -1) {
            const kid = decodedToken.header.kid;
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
          } else {
            console.warn("TaxId=%s not allowed", aud);
            throw new ValidationException("TaxId not allowed");
          }
        } else {
          console.warn("Role=%s not allowed", aud);
          throw new ValidationException("Role not allowed");
        }
      } else {
        console.warn("Issuer=%s not known", issuer);
        throw new ValidationException("Issuer not known");
      }
    } else {
      console.warn("Audience=%s not known", aud);
      throw new ValidationException("Invalid Audience");
    }
  } else {
    console.warn("decoded token is null, token is not valid");
    throw new ValidationException("Token is not valid");
  }
}

function checkIssuer(iss) {
  //verifica iss nel decoded token fa parte dei ALLOWED_ISSUER
  const allowedIssuers = process.env.ALLOWED_ISSUER.split(",");
  if (allowedIssuers != 0) {
    return allowedIssuers.indexOf(iss);
  } else {
    console.error(
      "Invalid env vars ALLOWED_ISSUER ",
      process.env.ALLOWED_ISSUER
    );
    return -1;
  }
}

function checkAudience(aud) {
  //verifica aud nel decoded token fa parte dei ACCEPTED_AUDIENCE
  const allowedAudiences = process.env.ACCEPTED_AUDIENCE.split(",");
  if (allowedAudiences != 0) {
    return allowedAudiences.indexOf(aud);
  } else {
    console.error(
      "Invalid env vars ACCEPTED_AUDIENCE",
      process.env.ACCEPTED_AUDIENCE
    );
    return -1;
  }
}

async function checkTaxIdCode(taxIdCode) {
  //verifica taxIdCode nel decoded token fa parte dei tax id permessi
  if (process.env.ALLOWED_TAXIDS_PARAMETER) {
    try {
      const allowedTaxIdsFromStore = await utils.getParameterFromStore(
        process.env.ALLOWED_TAXIDS_PARAMETER
      );
      if (allowedTaxIdsFromStore.length === 0) {
        return 0;
      }
      const allowedTaxIds = allowedTaxIdsFromStore.split(",");
      if (allowedTaxIds.indexOf(`!${taxIdCode}`) > -1) {
        return -1;
      }
      if (allowedTaxIds.includes("*")) {
        return 0;
      }
      return allowedTaxIds.indexOf(taxIdCode);
    } catch (e) {
      console.log(e);
      return -1;
    }
  }
  return 0;
}

function checkRoles(role) {
  const allowedRoles = ["admin", "operator"];

  if (allowedRoles != 0) {
    return allowedRoles.indexOf(role);
  } else {
    console.error("Invalid env vars ALLOWED_ROLES", process.env.ALLOWED_ROLES);
    return -1;
  }
}

module.exports = { validation };
