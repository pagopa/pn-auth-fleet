const ErrorRetrievingIdpCertDataException = require('../exception/errorRetrievingIdpCertDataException');
const CertDataNotFoundException = require('../exception/certDataNotFoundException');
const InvalidInstantFormatException = require('../exception/invalidInstantFormatException');
const TagListSearchOutOfBoundException = require('../exception/tagListSearchOutOfBoundException');
const ApiException = require('../exception/apiException');
const { CIE_ENTITY_ID } = require("../constants/lollipopConstants");

async function getListCertData(entityId, instant, entityConfig) {

    let listCertData = [];
    const isMissing = !entityId ||  !instant ||
        (typeof entityId === 'string' && entityId.trim().length === 0) ||
        (typeof instant === 'string' && instant.trim().length === 0);
    if (isMissing) {
        throw new Error("EntityID or Assertion Issue Instant missing");
    }

    //(CIE vs SPID)
    try {
        if (CIE_ENTITY_ID[0].includes(entityId)) {
            listCertData = await getCieCerts(entityId, instant, listCertData);
        } else {
            listCertData = await getSpidCerts(entityId, instant, listCertData);
        }
    } catch (e) {
        if (e instanceof CertDataNotFoundException) {
            throw new ErrorRetrievingIdpCertDataException(
                ErrorRetrievingIdpCertDataException.ErrorCode.IDP_CERT_DATA_NOT_FOUND,
                'Could not retrieve certificate data from provider', e);
        }
        throw e;
    }
    return listCertData;
}

    async function getCieCerts(entityId, instant, listCertData){

        console.log("[idpCertClient.getCieCerts]");
        let tagList = [];
        let listCertData;
        try {
            tagList = await getCIETagList(instant);
            return tagList;
        } catch (e) {
            if (e instanceof ApiException ||
                e instanceof TagListSearchOutOfBoundException ||
                e instanceof InvalidInstantFormatException) {
                    throw new CertDataNotFoundException('Error retrieving certificates tag list: ${e.message}', e);
            }
            throw e;
        }
        //TODO : storage Il client di storage (cache).
        listCertData = await processCertTags(tagList, entityId, listCertData, storage, idpCertClient);
        return listCertData;
    }

    async function getCIETagList(instant) {
        let responseAssertion;
        //TODO
        responseAssertion = await this.defaultApi.idpKeysCieGet();
        if (!responseAssertion || !Array.isArray(responseAssertion)) {
            throw new Error("La risposta API per i tag CIE non è un Array valido.");
        }
       /* if (!responseAssertion.ok ) {
            throw new ApiException( responseAssertion.status,
                'La chiamata API è fallita con stato ${response.status}', await response.json() );
        }*/
        return getTagsFromInstant(responseAssertion, instant);
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
        // Eseguo la ricerca
        while (notFound) {
            try {
                if (isTagListAlreadyFiltered(tagList, latest, longInstant)) {
                    return tagList;
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
            } catch (e) {
                throw new TagListSearchOutOfBoundException(
                  'Error finding the tags relative to assertion instant ${instant}. Original error: ${e.message}', e );
            }
        }
        return newTagList;
    }

    function getLongInstant(instant) {
        let longInstant;
        try {
            longInstant = Number(instant);
            if (isNaN(longInstant)) {
                throw new Error("Invalid number format");
            }
        } catch (e) {
            throw new InvalidInstantFormatException('The given instant ${instant} is not a valid timestamp');
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
        const isLatest = upperTag === latest;
        const isHigherOrEqual = longInstant <= Number(upperTag);
        return isLatest || isHigherOrEqual;
    }

    async function processCertTags(tagList, entityId, listCertData, storage, idpCertClient) {

        for (const tag of tagList) {
            let certData;
            try {
                const storageTag = tag + entityId;
                certData = await storage.getIdpCertData(storageTag);
                if (certData === null) {
                    // certData = getCIECertData(tag, entityId)
                    certData = await getCIECertData(tag, entityId, idpCertClient);

                    // Se lo ha trovato, salva
                    if (certData !== null) {
                        await storage.saveIdpCertData(storageTag, certData);
                    }
                } else {
                    await storage.saveIdpCertData(storageTag, certData);
                }
                if (certData !== null) {
                    listCertData.push(certData);
                }

            } catch (e) {
                if (e instanceof ApiException || e instanceof EntityIdNotFoundException) {
                    throw new CertDataNotFoundException(
                        'Error retrieving certificate data for tag ${tag}: ${e.message}', e );
                }
                throw e;
            }
        }

        return listCertData;
    }

    // SPID
    async function getSpidCerts(entityId, instant, listCertData){

        console.log("SONO DENTRO getSpidCerts");

        listCertData.push({
                type: 'SPID_CERT',
                data: 'MOCK_CERT_DATA'
            });

            return listCertData;
    }

module.exports = {
    getListCertData,
}
