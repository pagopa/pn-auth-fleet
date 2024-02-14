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
        console.log(message, { ...this.#context, ...meta });
    }

    warn(message, meta = {}) {
        console.warn(message, { ...this.#context, ...meta });
    }

    error(message, meta = {}) {
        console.error(message, { ...this.#context, ...meta });
    }
}

module.exports = Logger;