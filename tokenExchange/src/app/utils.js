const axios = require("axios");

function copyAndMaskObject(originalObject, sensitiveFields) {
  // Copia l'oggetto originale
  const copiedObject = Object.assign({}, originalObject);

  // Maschera i campi sensibili
  sensitiveFields.forEach((field) => {
    if (copiedObject.hasOwnProperty(field)) {
      copiedObject[field] = maskString(copiedObject[field]);
    }
  });

  return copiedObject;
}

function maskString(stringToMask) {
  if (stringToMask.length < 6) return "".padStart(stringToMask.length, "*");

  const firstTwoChars = stringToMask.substring(0, 2);
  const lastTwoChars = stringToMask.substring(
    stringToMask.length - 2,
    stringToMask.length
  );

  const hiddenStringLength = stringToMask.length - 4;
  const hiddenString = "".padStart(hiddenStringLength, "*");

  return firstTwoChars + hiddenString + lastTwoChars;
}

function checkOrigin(origin) {
  const allowedOrigins = process.env.ALLOWED_ORIGIN.split(",");
  if (allowedOrigins != 0) {
    return allowedOrigins.indexOf(origin);
  } else {
    console.error(
      "Invalid env vars ALLOWED_ORIGIN ",
      process.env.ALLOWED_ORIGIN
    );
    return -1;
  }
}

function makeLower(headers) {
  const head = {};
  for (const key in headers) {
    if (headers.hasOwnProperty(key)) {
      head[key.toLowerCase()] = headers[key];
    }
  }

  return head;
}

function getUserType(token) {
  if (!token.organization) {
    return "PF";
  }
  if (token.organization?.roles[0]?.role.startsWith("pg-")) {
    return "PG";
  }
  if (token.organization) {
    return "PA";
  }
}

function enrichDecodedToken(decodedToken) {
  const enrichedToken = decodedToken;
  // enrichedToken adds additional information
  if (enrichedToken.organization) {
    enrichedToken.organization.hasGroups = Boolean(
      enrichedToken.organization.groups?.length
    );
  }

  return enrichedToken;
}

async function getParameterFromStore(parameterName) {
  try {
    const response = await axios.get(
      `http://localhost:2773/systemsmanager/parameters/get?name=${encodeURIComponent(
        parameterName
      )}`,
      {
        headers: {
          "X-Aws-Parameters-Secrets-Token": process.env.AWS_SESSION_TOKEN,
        },
      }
    );
    return response.data.Parameter.Value;
  } catch (err) {
    console.error("Error in get parameter ", err);
    throw new Error("Error in get parameter");
  }
}

module.exports = {
  checkOrigin,
  copyAndMaskObject,
  enrichDecodedToken,
  getParameterFromStore,
  getUserType,
  makeLower,
};
