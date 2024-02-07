const axios = require('axios');
const { ContentLengthExceededError, UnsupportedProtocolError} = require('./errors');

async function downloadUrl(url) {
    // add param to follow redirect
    const config = {
        followRedirect: process.env.JWKS_FOLLOW_REDIRECT === 'true',
        contentType: 'application/json'
    }

    const maxContentLength = parseInt(process.env.JWKS_CONTENT_LIMIT_BYTES)
    if(maxContentLength){
        config.maxContentLength = maxContentLength
    }

    if(url.toLowerCase().indexOf('https')!==0){
        throw new UnsupportedProtocolError(`Unsupported protocol: ${url}`)
    }

    try {
        const response = await axios.get(url, config);
        return response.data;
    } catch(err){
        console.warn(err)
        // if AxiosError
        if(err.name === 'AxiosError'){
            if(err.message.indexOf('maxContentLength') > -1){
                throw new ContentLengthExceededError(`Content length exceeded for URL: ${url}`, maxContentLength, url)
            }

            if(err.response){
                throw new Error(`Error downloading URL: ${url}, status: ${err.response.status}, statusText: ${err.response.statusText}`);
            } else {
                throw new Error(`Error downloading URL: ${url}, message: ${err.message}`);
            }
        } else {
            throw err;
        }
    }
}

module.exports = {
    downloadUrl
}