class IdpCertData {
     entityId;
     tag;
     certData = [];

    constructor(data = {}) {
        this.entityId = data.entityId;
        this.tag = data.tag;

        this.certData = data.certData !== undefined ? data.certData : this.certData;

        // OPPURE (se si usa la destrutturazione con default interni):
        /*
        const { entityId, tag, certData = [] } = data;
        this.entityId = entityId;
        this.tag = tag;
        this.certData = certData;
        */
    }

}
module.exports = IdpCertData;
