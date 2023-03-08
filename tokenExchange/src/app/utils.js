const axios = require('axios');

module.exports = {
  checkOrigin,
  enrichDecodedToken,
  getUserType,
  makeLower,
  getParameterFromStore
}

function checkOrigin(origin) {
  const allowedOrigins = process.env.ALLOWED_ORIGIN.split( ',' )
  if (allowedOrigins != 0) {
    return allowedOrigins.indexOf( origin )
  } else {
    console.error( 'Invalid env vars ALLOWED_ORIGIN ', process.env.ALLOWED_ORIGIN )
    return -1;
  }
}

function makeLower(headers) {
  let head = {}
  for(const key in headers) {
    if (headers.hasOwnProperty(key)) {
      head[key.toLowerCase()] = headers[key]
    }
  }

  return head
}

function getUserType(token) {
  if (!token.organization) {
    return 'PF';
  }
  if (token.organization && token.organization.roles[0]?.role.startsWith('pg-')) {
    return 'PG';
  }
  if (token.organization) {
    return 'PA';
  }
}

function enrichDecodedToken(decodedToken) {
  const enrichedToken = decodedToken
  // enrichedToken adds additional information
  if (enrichedToken.organization) {
    enrichedToken.organization.hasGroups = Boolean(enrichedToken.organization.groups?.length)
  }

  return enrichedToken
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