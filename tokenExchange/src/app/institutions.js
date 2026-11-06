const axios = require("axios");
const utils = require("./utils.js");

const SUPPORTED_INSTITUTION_TYPES = ["PA", "PG", "PT"];

let selfcareApiKeys;

async function getSelfcareApiKeys() {
  if (!selfcareApiKeys) {
    const secret = await utils.getSecretFromStore(process.env.SELFCARE_SECRET_NAME);
    selfcareApiKeys = JSON.parse(secret);
  }
  return selfcareApiKeys;
}

// returns undefined for PF (no organization)
async function getInstitutionType(organization) {
  const role = organization?.roles?.[0]?.role;
  const isPg = Boolean(role?.startsWith("pg-"));

  if (!organization) {
    return undefined;
  }

  try {
    const apiKeys = await getSelfcareApiKeys();
    const baseUrl = isPg ? process.env.SELFCARE_PG_BASEURL : process.env.SELFCARE_BASEURL;
    const apiKey = isPg ? apiKeys.SelfCarePgApiKey : apiKeys.SelfCareApiKey;
    const url = `${baseUrl}/institutions/${encodeURIComponent(organization.id)}`;

    console.info("Invoking Selfcare get institution. Waiting Sync response.", {
      institutionId: organization.id,
      url,
    });
    const response = await axios.get(url, {
      headers: { "Ocp-Apim-Subscription-Key": apiKey },
      timeout: 2000,
    });

    const institutionType = response.data?.institutionType;
    if (!institutionType) {
      throw new Error("institutionType not present in Selfcare response");
    }
    if (!SUPPORTED_INSTITUTION_TYPES.includes(institutionType)) {
      throw new Error(`institutionType ${institutionType} not supported`);
    }
    return institutionType;
  } catch (err) {
    console.error("Error retrieving institution type from Selfcare", {
      institutionId: organization.id,
      error: err.message,
      status: err.response?.status,
    });
    throw new Error("Error in get institution type");
  }
}

function clearCache() {
  selfcareApiKeys = undefined;
}

module.exports = { getInstitutionType, clearCache };
