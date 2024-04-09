class IssuerNotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'IssuerNotFoundError';
    }
}

module.exports = IssuerNotFoundError;