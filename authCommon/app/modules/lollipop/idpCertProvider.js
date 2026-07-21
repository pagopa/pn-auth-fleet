const axios = require("axios");
const xml2js = require("xml2js");
const LollipopValidationError = require("./LollipopValidationError");
const { lollipopConfig } = require("./lollipopConfig");
const { VALIDATION_ERROR_CODES } = require("./lollipopErrorsConstants");

async function getIdpCertData(assertionDoc, idpConfig) {
  const { entityId, issueInstant } =
    getAssertionIssuerAndIssueInstant(assertionDoc);
  const instant = parseInstantToUnixTimestamp(issueInstant);

  validateIdpConfig(idpConfig);

  const providerType = idpConfig.cieEntityIds.includes(entityId)
    ? "cie"
    : "spid";

  const tags = await getTags(providerType, instant, idpConfig);
  const certificates = [];

  for (const tag of tags) {
    certificates.push(
      await getCertificateData(providerType, tag, entityId, idpConfig),
    );
  }

  return certificates;
}

function getAssertionIssuerAndIssueInstant(assertionDoc) {
  const assertions = assertionDoc.getElementsByTagNameNS(
    lollipopConfig.samlNamespaceAssertion,
    lollipopConfig.assertionTag,
  );

  if (!assertions || assertions.length === 0) {
    throw new LollipopValidationError(
      VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION,
      "No Assertion found in document",
    );
  }

  const assertion = assertions[0];
  const issueInstant = assertion.getAttribute(lollipopConfig.ISSUE_INSTANT);
  const entityId = getEntityId(
    assertion.childNodes,
    lollipopConfig.ISSUER_ENTITY_ID_TAG,
  );

  if (!issueInstant || !entityId) {
    throw new LollipopValidationError(
      VALIDATION_ERROR_CODES.IDP_CERT_DATA_NOT_FOUND,
      "Missing IssueInstant or Issuer in the retrieved SAML assertion",
    );
  }

  return {
    entityId: entityId.trim(),
    issueInstant,
  };
}

function getEntityId(childNodeList, entityIdTag) {
  if (!childNodeList) {
    return null;
  }

  const elementsArray = Array.from(childNodeList);

  for (const item of elementsArray) {
    if (item && item.localName && item.localName === entityIdTag) {
      return item.textContent || null;
    }
  }

  return null;
}

function parseInstantToUnixTimestamp(instant) {
  const milliseconds = Date.parse(instant);

  if (Number.isNaN(milliseconds)) {
    throw new LollipopValidationError(
      VALIDATION_ERROR_CODES.IDP_CERT_DATA_NOT_FOUND,
      `Retrieved instant ${instant} does not match expected ISO datetime format`,
    );
  }

  return String(Math.floor(milliseconds / 1000));
}

async function getTags(providerType, instant, idpConfig) {
  const response = await get(
    `${idpConfig.baseUrl}/idp-keys/${providerType}`,
    idpConfig.timeoutMs,
    {
      headers: {
        Accept: "application/json",
      },
      responseType: "json",
    },
  );

  if (!Array.isArray(response.data) || response.data.length === 0) {
    throw new LollipopValidationError(
      VALIDATION_ERROR_CODES.IDP_CERT_DATA_NOT_FOUND,
      `The response API for ${providerType.toUpperCase()} tags is not a valid non-empty array`,
    );
  }

  return getTagsFromInstant([...response.data], instant);
}

async function getCertificateData(providerType, tag, entityId, idpConfig) {
  const response = await get(
    `${idpConfig.baseUrl}/idp-keys/${providerType}/${encodeURIComponent(tag)}`,
    idpConfig.timeoutMs,
    {
      headers: {
        Accept: "application/xml, application/json",
      },
      responseType: "arraybuffer",
    },
  );

  if (response.data === null || response.data === undefined) {
    throw new LollipopValidationError(
      VALIDATION_ERROR_CODES.IDP_CERT_DATA_NOT_FOUND,
      `No certificate data found for tag ${tag}`,
    );
  }

  const xmlBuffer = Buffer.isBuffer(response.data)
    ? response.data
    : Buffer.from(response.data);

  const entitiesDescriptorObject = await parseMetadata(
    xmlBuffer.toString("utf8"),
  );

  const certData = unpackNestedSignature(
    entitiesDescriptorObject,
    entityId,
    providerType === "cie" ? "CIE" : "SPID",
  );

  return getEntityData(certData, tag, entityId);
}

async function get(url, timeoutMs, options) {
  try {
    return await axios.get(url, {
      timeout: timeoutMs,
      ...options,
    });
  } catch (error) {
    throw new LollipopValidationError(
      VALIDATION_ERROR_CODES.IDP_CERT_DATA_NOT_FOUND,
      `Error retrieving IDP certificates: ${error.message}`,
      error,
    );
  }
}

function parseMetadata(xmlString) {
  const xmlParser = new xml2js.Parser({ explicitArray: false });

  return new Promise((resolve, reject) => {
    xmlParser.parseString(xmlString, (error, result) => {
      if (error) {
        reject(
          new LollipopValidationError(
            VALIDATION_ERROR_CODES.IDP_CERT_DATA_NOT_FOUND,
            `Error parsing IDP certificate XML: ${error.message}`,
            error,
          ),
        );
        return;
      }

      resolve(result);
    });
  });
}

function validateIdpConfig(idpConfig) {
  if (
    !idpConfig ||
    typeof idpConfig.baseUrl !== "string" ||
    idpConfig.baseUrl.trim() === ""
  ) {
    throw new LollipopValidationError(
      VALIDATION_ERROR_CODES.IDP_CERT_DATA_NOT_FOUND,
      "IDP certificate provider base URL is missing",
    );
  }

  if (!Array.isArray(idpConfig.cieEntityIds)) {
    throw new LollipopValidationError(
      VALIDATION_ERROR_CODES.IDP_CERT_DATA_NOT_FOUND,
      "IDP CIE entity IDs must be an array",
    );
  }
}

function getTagsFromInstant(tagList, instant) {
  const newTagList = [];
  const latest = "latest";
  const longInstant = getLongInstant(instant);
  const latestIndex = tagList.indexOf(latest);
  const latestRemoved = latestIndex !== -1;

  if (latestRemoved) {
    tagList.splice(latestIndex, 1);
  }

  tagList.sort();

  if (latestRemoved) {
    tagList.push(latest);
  }

  let index = Math.floor(tagList.length / 2);
  let notFound = true;

  while (notFound) {
    if (isTagListAlreadyFiltered(tagList, latest, longInstant)) {
      return tagList;
    }

    if (index <= 0 || index >= tagList.length) {
      throw new LollipopValidationError(
        VALIDATION_ERROR_CODES.IDP_CERT_DATA_NOT_FOUND,
        `No IDP certificate tag is available for assertion instant ${instant}`,
      );
    }

    const upperTag = tagList[index];
    const lowerTag = tagList[index - 1];

    if (upperTagIsHigherOrLatest(latest, longInstant, upperTag)) {
      if (longInstant >= Number(lowerTag)) {
        notFound = false;
        newTagList.push(upperTag);
        newTagList.push(lowerTag);
      } else {
        index -= 1;
      }
    } else {
      index += 1;
    }
  }

  return newTagList;
}

function getLongInstant(instant) {
  const longInstant = Number(instant);

  if (Number.isNaN(longInstant)) {
    throw new LollipopValidationError(
      VALIDATION_ERROR_CODES.IDP_CERT_DATA_NOT_FOUND,
      `The given instant ${instant} is not a valid timestamp`,
    );
  }

  return Math.floor(longInstant);
}

function isTagListAlreadyFiltered(tagList, latest, longInstant) {
  if (tagList.length <= 2) {
    if (tagList.length === 0) {
      return false;
    }

    const firstTimestamp = tagList[0];
    const isLatest = firstTimestamp === latest;
    const isLowerThanInstant =
      !isLatest && Number(firstTimestamp) <= longInstant;

    return isLatest || isLowerThanInstant;
  }

  return false;
}

function upperTagIsHigherOrLatest(latest, longInstant, upperTag) {
  return upperTag === latest || longInstant <= Number(upperTag);
}

function getEntityData(certDataList, tag, entityId) {
  if (!Array.isArray(certDataList)) {
    throw new LollipopValidationError(
      VALIDATION_ERROR_CODES.IDP_CERT_DATA_NOT_FOUND,
      "The parsed IDP metadata has an unexpected certificate structure",
    );
  }

  const certData = certDataList.filter(
    (certificate) => certificate !== undefined,
  );

  if (certData.length === 0) {
    throw new LollipopValidationError(
      VALIDATION_ERROR_CODES.IDP_CERT_DATA_NOT_FOUND,
      `Cert for entityID ${entityId} not found`,
    );
  }

  return {
    entityId,
    tag,
    certData,
  };
}

function unpackNestedSignature(entitiesDescriptorObject, entityId, type) {
  let namespace = "";
  let entitiesDescriptorRoot = entitiesDescriptorObject;

  if (type === "SPID") {
    namespace = lollipopConfig.NAMESPACE_TAG;
    entitiesDescriptorRoot =
      entitiesDescriptorObject[
        namespace + lollipopConfig.ENTITIES_DESCRIPTOR_TAG
      ];
  }

  if (!entitiesDescriptorRoot) {
    throw new LollipopValidationError(
      VALIDATION_ERROR_CODES.IDP_CERT_DATA_NOT_FOUND,
      "The parsed IDP metadata does not contain the expected root element",
    );
  }

  const entityDescriptors =
    entitiesDescriptorRoot[namespace + lollipopConfig.ENTITY_DESCRIPTOR_TAG];

  const entityDescriptor = toArray(entityDescriptors).find(
    (element) => element.$ && element.$.entityID === entityId,
  );

  if (
    !entityDescriptor ||
    !entityDescriptor[namespace + lollipopConfig.IDPSSO_DESCRIPTOR_TAG]
  ) {
    throw new LollipopValidationError(
      VALIDATION_ERROR_CODES.IDP_CERT_DATA_NOT_FOUND,
      `Cert for entityID ${entityId} not found`,
    );
  }

  const idpssoDescriptor =
    entityDescriptor[namespace + lollipopConfig.IDPSSO_DESCRIPTOR_TAG];

  const keyDescriptorsList = getKeyDescriptorsList(
    idpssoDescriptor,
    namespace + lollipopConfig.KEY_DESCRIPTOR_TAG,
  );

  const keyInfosList = getKeyInfosList(keyDescriptorsList);
  const listX509Data = getListX509Data(keyInfosList);

  return getExtractedSignatureList(listX509Data);
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value != null) return [value];
  return [];
}

function getKeyDescriptorsList(idpssoDescriptor, keyDescriptor) {
  return toArray(idpssoDescriptor[keyDescriptor]).filter(
    (element) => element.$ && element.$.use === "signing",
  );
}

function getKeyInfosList(keyDescriptorsList) {
  const keyInfosList = [];

  for (const keyDescriptor of keyDescriptorsList) {
    keyInfosList.push(...toArray(keyDescriptor[lollipopConfig.DS_KEYINFO_TAG]));
  }

  return keyInfosList;
}

function getListX509Data(keyInfosList) {
  const listX509Data = [];

  for (const keyInfo of keyInfosList) {
    listX509Data.push(...toArray(keyInfo[lollipopConfig.DS_X509DATA_TAG]));
  }

  return listX509Data;
}

function getExtractedSignatureList(listX509Data) {
  const extractedSignatureList = [];

  for (const x509Data of listX509Data) {
    extractedSignatureList.push(
      ...toArray(x509Data[lollipopConfig.DS_X509CERTIFICATE_TAG]),
    );
  }

  return extractedSignatureList;
}

module.exports = {
  getIdpCertData,
  parseInstantToUnixTimestamp,
  getTagsFromInstant,
};
