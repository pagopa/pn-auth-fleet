class CommandResult{

    resultCode = null;
    resultMessage = null;
    name = null;
    familyName = null;

    constructor(data = {}) {
        this.resultCode = data.resultCode || null;
        this.resultMessage = data.resultMessage || null;
        this.name = data.name || null;
        this.familyName = data.familyName || null;
    }

}