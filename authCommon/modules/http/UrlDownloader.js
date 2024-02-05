const axios = require('axios');

async function downloadUrl(url) {
    // add param to follow redirect
    const config = {
        followRedirect: process.env.JWKS_FOLLOW_REDIRECT === 'true'
    }

    const maxContentLength = parseInt(process.env.JWKS_BODY_LIMIT_BYTES)
    if(maxContentLength){
        config.maxContentLength = maxContentLength
    }

    const response = await axios.get(url, config);
    return response.data;
}

module.exports = {
    downloadUrl
}