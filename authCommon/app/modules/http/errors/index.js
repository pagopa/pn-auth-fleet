// define new error
class ContentLengthExceededError extends Error
{
    constructor(message, maxContentLength, url)
    {
        super(message);
        this.name = 'ContentLengthExceededError';
        this.maxContentLength = maxContentLength;
        this.url = url;
    }
}

class UnsupportedProtocolError extends Error
{
    constructor(message)
    {
        super(message);
        this.name = 'UnsupportedProtocolError';
    }
}

module.exports = {
    ContentLengthExceededError,
    UnsupportedProtocolError
}
