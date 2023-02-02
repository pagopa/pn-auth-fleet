module.exports = {
  checkOrigin,
  makeLower,
  getUserType
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