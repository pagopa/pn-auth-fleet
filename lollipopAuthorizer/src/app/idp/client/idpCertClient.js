import {ErrorRetrievingIdpCertDataException, ErrorCode } from '../../exception/errorRetrievingIdpCertDataException.js';
import CertDataNotFoundException  from '../../exception/certDataNotFoundException.js';
import InvalidInstantFormatException  from '../../exception/invalidInstantFormatException.js';
import TagListSearchOutOfBoundException from '../../exception/tagListSearchOutOfBoundException.js';
import EntityIdNotFoundException from '../../exception/entityIdNotFoundException.js';
import ApiException from '../../exception/apiException.js';
import CertData from '../model/CertData.js';
import DefaultApi from '../api/DefaultApi.js';
import EntityDescriptor  from '../model/EntityDescriptor.js';
import SPIDCertData from '../model/SPIDCertData.js';
import CIECertData from '../model/CIECertData.js';
import IdpCertData from '../../model/IdpCertData.js';
import xml2js from 'xml2js';
const parser = new xml2js.Parser({ explicitArray: false });

class IdpCertClient {

      idpClientConfig;
      apiClient;
      defaultApi;

    constructor(apiClient = {}, idpClientConfig = {}) {
        this.idpClientConfig = idpClientConfig;
        this.apiClient = apiClient;
        this.defaultApi = new DefaultApi(apiClient);
    }


    /**
    * Retrieve the certification data of the given entityId issued in the same timeframe as the
    * issue instant of the SAML assertion
     * @param entityId Identity Provider ID
     * @param instant Assertion Issue Instant
     * @return the certifications issued before and after the timestamp instant
    */
    async getListCertData(entityId, instant) {

        let listCertData = [];
        const isMissing = !entityId ||  !instant ||
            (typeof entityId === 'string' && entityId.trim().length === 0) ||
            (typeof instant === 'string' && instant.trim().length === 0);
        if (isMissing) {
            throw new Error("EntityID or Assertion Issue Instant missing");
        }

        //(CIE vs SPID) getListCertData
        try {
            //this.idpClientConfig è settato IDP_PROVIDER_CONFIG nel costruttore
            if (this.idpClientConfig.CIE_ENTITY_ID[0].includes(entityId)) {
                listCertData = await this.getCieCerts(entityId, instant, listCertData, "CIECertData");
            } else {
                listCertData = await this.getSpidCerts(entityId, instant, listCertData, "SPIDCertData");
            }
        } catch (e) {
            if (e instanceof CertDataNotFoundException) {
                throw new ErrorRetrievingIdpCertDataException(
                    ErrorCode.IDP_CERT_DATA_NOT_FOUND,
                    "Could not retrieve certificate data from provider", e);
            }
            throw e;
        }
        return listCertData;
    }


    async getCieCerts(entityId, instant, listCertData, typeOfData){

        console.log("[idpCertClient.getCieCerts]");
        let tagList = [];
        try {
            tagList = await this.getCIETagList(instant); // lista dei tag CIE
        } catch (e) {
            if (e instanceof ApiException ||
                e instanceof TagListSearchOutOfBoundException ||
                e instanceof InvalidInstantFormatException) {
                    throw new CertDataNotFoundException('Error retrieving certificates tag list: ${e.message}', e);
            }
            throw e;
        }

        listCertData = await this.processCertTags(tagList, entityId, typeOfData);
        console.log('listCertData: ' , listCertData);
        return listCertData;
    }

    //return lista tagList
    async getCIETagList(instant) {

       let responseAssertion = await new Promise((resolve, reject) => {
            this.defaultApi.idpKeysCieGet((error, data) => {
                if (error) {
                    console.error("Errore nella chiamata idpKeysCieGet: ", error);
                    reject(error);
                    return;
                }
                // Se ha successo, risolve la Promise restituendo i dati (l'Array di tag)
                resolve(data);
            });
        });

        if (!responseAssertion || !Array.isArray(responseAssertion)) {
            throw new Error("La risposta API per i tag CIE non è un Array valido.");
        }
        return getTagsFromInstant(responseAssertion, instant);
    }

    async processCertTags(tagList, entityId, typeOfData) {
        let listCertData = [];
        console.log('tagList: ' , tagList);
        for (const tag of tagList) {
            try {
                console.log('[processCertTags] tag: ', tag);
                let certData;
                if(typeOfData === "CIECertData"){
                    certData = await this.getCIECertData(tag, entityId); // , idpCertClient);
                }
                if(typeOfData === "SPIDCertData"){
                    certData = await this.getSPIDCertData(tag, entityId); // , idpCertClient);
                }
                console.log('[processCertTags] certData: ', certData);
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

    async getCIECertData(tag, entityId) {
        let responseData;
        try {
            responseData = await new Promise((resolve, reject) => {
                // Chiama il metodo API, passando il callback come ultimo argomento
                this.defaultApi.idpKeysCieTagGet(tag, (error, data, response) => {
                    if (error) {
                        // Se c'è un errore, rigetta la Promise
                        console.error("Errore nella chiamata idpKeysCieTagGet:", error);
                        reject(error);
                        return;
                    }
                    // 'data' contiene l'oggetto CertData deserializzato
                    resolve(data);
                });
            });
        } catch (error) {
            console.error("Errore nella chiamata idpKeysCieTagGet: ", error);
            throw error;
        }

        const responseAssertion = responseData.getActualInstance();  //certData
        if (!Buffer.isBuffer(responseAssertion)) {
            // Gestione di un caso in cui la risposta non è un Buffer come atteso
            throw new Error("Risposta API non è un Buffer XML come previsto.");
        }
        const xmlString = responseAssertion.toString('utf8');
        //console.log('responseAssertion xmlString: ' , xmlString);
        const entitiesDescriptorObject = await new Promise((resolve, reject) => {
            parser.parseString(xmlString, (err, result) => {
                if (err) {
                    reject(new ApiException(`Errore durante il parsing XML del certificato: ${err.message}`));
                    return;
                }
                resolve(result);
            });
        });

        //const entitiesDescriptor = EntityDescriptor.constructFromObject(responseAssertion, new EntityDescriptor());
        //console.log('entitiesDescriptor: ' , entitiesDescriptorObject);
        return getEntityData(entitiesDescriptorObject, tag, entityId);
    }

    // SPID
    async getSpidCerts(entityId, instant, listCertData){

        console.log("[idpCertClient.getSpidCerts]");
        let tagList = [];
        try {
            tagList = await this.getSPIDTagList(instant); // lista dei tag SPID
        } catch (e) {
            if (e instanceof ApiException ||
                e instanceof TagListSearchOutOfBoundException ||
                e instanceof InvalidInstantFormatException) {
                    throw new CertDataNotFoundException('Error retrieving certificates tag list: ${e.message}', e);
            }
            throw e;
        }

        listCertData = await this.processCertTags(tagList, entityId);
        return listCertData;
    }


    //return lista tagList
    async getSPIDTagList(instant) {

        let responseAssertion = await new Promise((resolve, reject) => {
            this.defaultApi.idpKeysSpidGet((error, data) => {
                if (error) {
                    console.error("Errore nella chiamata idpKeysSpidGet:", error);
                    reject(error);
                    return;
                }
                // Se ha successo, risolvi la Promise restituendo i dati (l'Array di tag)
                resolve(data);
            });
        });

        if (!responseAssertion || !Array.isArray(responseAssertion)) {
            throw new Error("La risposta API per i tag SPID non è un Array valido.");
        }
        return getTagsFromInstant(responseAssertion, instant);
    }


    async getSPIDCertData(tag, entityId) {
        let responseData;
        try {
            responseData = await new Promise((resolve, reject) => {
                // Chiama il metodo API, passando il callback come ultimo argomento
                this.defaultApi.idpKeysSpidTagGet(tag, (error, data, response) => {
                    if (error) {
                        // Se c'è un errore, rigetta la Promise
                        console.error("Errore nella chiamata idpKeysSpidTagGet:", error);
                        reject(error);
                        return;
                    }
                    // 'data' contiene l'oggetto CertData deserializzato
                    resolve(data);
                });
            });

        } catch (error) {
            console.error("Errore nella chiamata idpKeysSpidTagGet: ", error);
            throw error;
        }

        const responseAssertion = responseData.getActualInstance();  //certData
        if (!Buffer.isBuffer(responseAssertion)) {
            // Gestione di un caso in cui la risposta non è un Buffer come atteso
            throw new Error("Risposta API non è un Buffer XML come previsto.");
        }
        const xmlString = responseAssertion.toString('utf8');
        //console.log('responseAssertion xmlString: ' , xmlString);
        const entitiesDescriptorObject = await new Promise((resolve, reject) => {
            parser.parseString(xmlString, (err, result) => {
                if (err) {
                    reject(new ApiException(`Errore durante il parsing XML del certificato: ${err.message}`));
                    return;
                }
                resolve(result);
            });
        });
        console.log('entitiesDescriptor: ' , entitiesDescriptorObject);
        return getEntityData(entitiesDescriptorObject, tag, entityId);
    }

} // FINE CLASSE IdpCertClient




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


    /*itera su una lista di descrittori di entità, cercando una corrispondenza con l'ID entità
    * e se lo trova costruisce un nuovo oggetto IdpCertData
    * data === entitiesDescriptorObject.EntitiesDescriptor
    **/
    function getEntityData(data, tag, entityId) {
        const newData = new IdpCertData();

        const entitiesContainer = data.EntityDescriptor;
        const entityList = Array.isArray(entitiesContainer) ? entitiesContainer : [entitiesContainer];
        for (const entity of entityList) {
            const currentEntityId = entity['$'] ? entity['$'].entityID : entity.entityID;
            if (currentEntityId === entityId) {
                //console.log('currentEntityId: ', currentEntityId);
                newData.entityId = entityId;
                newData.tag = tag;
                const certDataList = entity.Signature || entity.KeyDescriptor || [];
                newData.certData = certDataList;
                return newData;
            }
        }
        throw new EntityIdNotFoundException('Cert for entityID ${entityId} not found');
    }



export default IdpCertClient;

