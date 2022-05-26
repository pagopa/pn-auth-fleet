const axios = require('axios');

module.exports = {
    async getCxId(taxId) {
        const pnDataVaultBaseUrl = process.env.PN_DATA_VAULT_BASEURL;
        const pnDataVaultUrl = pnDataVaultBaseUrl + '/datavault-private/v1/recipients/external/PF/' + taxId;
        try {
            let response = await axios.get(pnDataVaultUrl);
            return response.data.internalId;
        } catch(err){
            console.error('Error in get external Id ', err);
            throw new Error('Error in get external Id');
        }
    }
}