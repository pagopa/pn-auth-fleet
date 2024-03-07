class Logger {
    #context = {};

    constructor(context) {
        this.context = context;
    }

    addToContext(key, value){
        this.#context[key] = value;
    }

    removeFromContext(key){
        delete this.#context[key];
    }

    clearContext() {
        this.#context = {};
    }

    log(message, meta = {}) {
        const logMeta =  { ...this.#context, ...meta } || {}
        console.log(message, JSON.stringify(logMeta, null, 2));
    }

    warn(message, meta = {}) {
        const logMeta =  { ...this.#context, ...meta } || {}
        console.warn(message, JSON.stringify(logMeta, null, 2));
    }

    error(message, meta = {}) {
        const logMeta =  { ...this.#context, ...meta } || {}
        console.error(message, JSON.stringify(logMeta, null, 2));
    }
}

module.exports = Logger;