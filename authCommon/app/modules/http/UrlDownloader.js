const axios = require('axios');
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { ContentLengthExceededError, UnsupportedProtocolError} = require('./errors');
const { Readable } = require('stream');

async function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
}

async function downloadUrl(url) {


    if (url.toLowerCase().startsWith("s3://")) {
        const splittedUrl = url.substring(5).split('/');
        const bucket = splittedUrl.shift();
        const key = splittedUrl.join('/')
        
        // initialize s3Client
        const s3Client = new S3Client()

        try {
            const input = {
                Bucket: bucket,
                Key: key
            }
            const command = new GetObjectCommand(input)
            const data = await s3Client.send(command);

            const byteArray = await streamToBuffer(data.Body);

            return byteArray;
        }
        catch (err) {
            console.warn(err)
            // if Error
            throw new Error(`Error downloading S3 object from URL: ${url}`);
        }
    }
    else {
        // add param to follow redirect
        const config = {
            followRedirect: process.env.JWKS_FOLLOW_REDIRECT === 'true',
            contentType: 'application/json',
            responseType: 'arraybuffer'
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
            const byteArray = Buffer.from(response.data, 'binary');
            return byteArray;
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
}

module.exports = {
    downloadUrl
}