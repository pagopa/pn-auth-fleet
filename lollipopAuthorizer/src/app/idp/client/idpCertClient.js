const CertDataNotFoundException = require('../../exception/certDataNotFoundException');
const IllegalArgumentException = require('../../exception/illegalArgumentException');
const InvalidInstantFormatException  = require('../../exception/invalidInstantFormatException');
const TagListSearchOutOfBoundException  = require('../../exception/tagListSearchOutOfBoundException');
const EntityIdNotFoundException  = require( '../../exception/entityIdNotFoundException');
const {ErrorRetrievingIdpCertDataException, ErrorCode } = require('../../exception/errorRetrievingIdpCertDataException');
const {lollipopConfig} = require('../../config/lollipopConsumerRequestConfig');
const ApiException  = require( '../../exception/apiException');
const CIECertData  = require( '../model/CIECertData');
const SPIDCertData  = require( '../model/SPIDCertData');
const DefaultApi  = require( '../api/DefaultApi');
const EntityDescriptor = require( '../model/EntityDescriptor');
const IdpCertData = require( '../../model/IdpCertData');
const xml2js = require('xml2js');


class IdpCertClient {

      idpClientConfig;
      apiClient;
      defaultApi;
      xmlParser;

    constructor(apiClient = {}, idpClientConfig = {}) {
        this.idpClientConfig = idpClientConfig;
        this.apiClient = apiClient;
        this.defaultApi = new DefaultApi(apiClient, idpClientConfig);
        this.xmlParser = new xml2js.Parser({ explicitArray: false });
    }


    /**
    * Retrieve the certification data of the given entityId issued in the same timeframe as the
    * issue instant of the SAML assertion
     * @param entityId Identity Provider ID
     * @param instant Assertion Issue Instant
     * @return the certifications issued before and after the timestamp instant
    */
    async getListCertData(entityId, instant) {
        console.log('[idpCertClient - getListCertData]');
        let listCertData = [];
        const isMissing = !entityId ||  !instant ||
            (typeof entityId === 'string' && entityId.trim().length === 0) ||
            (typeof instant === 'string' && instant.trim().length === 0);
        if (isMissing) {
            throw new IllegalArgumentException("EntityID or Assertion Issue Instant missing");
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
                e instanceof InvalidInstantFormatException){
                    console.error(`ERROR: Error retrieving certificates tag list: ${e.message}`);
                    throw new CertDataNotFoundException(`Error retrieving certificates tag list: ${e.message}`, e);
            }
            throw e;
        }

        listCertData = await this.processCertTags(tagList, entityId, typeOfData);
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
        for (const tag of tagList) {
            try {
                let certData;
                if(typeOfData === "CIECertData"){
                    certData = await this.getCIECertData(tag, entityId); // , idpCertClient);
                }
                if(typeOfData === "SPIDCertData"){
                    certData = await this.getSPIDCertData(tag, entityId); // , idpCertClient);
                }
                if (certData !== null) {
                    listCertData.push(certData);
                }
            } catch (e) {
                if (e instanceof ApiException || e instanceof EntityIdNotFoundException) {
                    console.error(`ERROR: Error retrieving certificate data for tag ${tag}: ${e.message}`);
                    throw new CertDataNotFoundException(
                        `Error retrieving certificate data for tag ${tag}: ${e.message}`, e );
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
            throw new EntityIdNotFoundException(`Error retrieving certificates tag list: ${error.message}`, error);
        }

        if (responseData === null || responseData === undefined) {
            // Se l'API restituisce 204 No Content o un corpo vuoto,
            // significa che il certificato non è stato trovato per quel tag/entityId.
            // Lanciamo l'eccezione di business attesa.
            console.error(`ERROR: No certificate data found for tag: ${tag}`);
            throw new EntityIdNotFoundException(`No certificate data found for tag: ${tag}`);
        }

        const responseAssertion = responseData.getActualInstance();  //certData
        if (!Buffer.isBuffer(responseAssertion)) {
            // Gestione di un caso in cui la risposta non è un Buffer come atteso
            throw new Error("Risposta API non è un Buffer XML come previsto.");
        }
        const xmlString = responseAssertion.toString('utf8');

        const entitiesDescriptorObject = await new Promise((resolve, reject) => {
            this.xmlParser.parseString(xmlString, (err, result) => {
                if (err) {
                    reject(new ApiException(`Errore durante il parsing XML del certificato: ${err.message}`));
                    return;
                }
                resolve(result);
            });
        });


        let entityList = unpackNestedSignature( entitiesDescriptorObject, entityId , 'CIE');

        return getEntityData(entityList, tag, entityId, new CIECertData());
    }

    // SPID
    async getSpidCerts(entityId, instant, listCertData, typeOfData){

        console.log("[idpCertClient.getSpidCerts]");
        let tagList = [];
        try {
            tagList = await this.getSPIDTagList(instant); // lista dei tag SPID
        } catch (e) {
            if (e instanceof ApiException ||
                e instanceof TagListSearchOutOfBoundException ||
                e instanceof InvalidInstantFormatException) {
                    console.error(`ERROR: Error retrieving certificates tag list: ${e.message}`);
                    throw new CertDataNotFoundException(`Error retrieving certificates tag list: ${e.message}`, e);
            }
            throw e;
        }

        listCertData = await this.processCertTags(tagList, entityId, typeOfData);
        return listCertData;
    }


    //return lista tagList
    async getSPIDTagList(instant) {
        console.log("[idpCertClient.getSPIDTagList]");
        let responseAssertion = await new Promise((resolve, reject) => {
            this.defaultApi.idpKeysSpidGet((error, data) => {
                if (error) {
                    console.error("Errore nella chiamata idpKeysSpidGet: ", error);
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
        console.log("[idpCertClient.getSPIDCertData]");
        let responseData;
        try {
            responseData = await new Promise((resolve, reject) => {
                // Chiama il metodo API, passando il callback come ultimo argomento
                this.defaultApi.idpKeysSpidTagGet(tag, (error, data, response) => {
                    if (error) {
                        // Se c'è un errore, rigetta la Promise
                        console.error('Errore nella chiamata idpKeysSpidTagGet: ', error);
                        reject(error);
                        return;
                    }
                    // 'data' contiene l'oggetto CertData deserializzato
                    resolve(data);
                });
            });

        } catch (error) {
            console.error('Errore nella chiamata idpKeysSpidTagGet: ', error);
            throw new EntityIdNotFoundException(`Error retrieving certificates tag list: ${error.message}`, error);
        }

        if (responseData === null || responseData === undefined) {
            // Se l'API restituisce 204 No Content o un corpo vuoto,
            // significa che il certificato non è stato trovato per quel tag/entityId.
            // Lanciamo l'eccezione di business attesa.
            console.error(`ERROR: No certificate data found for tag: ${tag}`);
            throw new EntityIdNotFoundException(`No certificate data found for tag: ${tag}`);
        }

        const responseAssertion = responseData.getActualInstance();  //certData
        if (!Buffer.isBuffer(responseAssertion)) {
            // Gestione di un caso in cui la risposta non è un Buffer come atteso
            throw new Error('Risposta API non è un Buffer XML come previsto.');
        }
        const xmlString = responseAssertion.toString('utf8');

        const entitiesDescriptorObject = await new Promise((resolve, reject) => {
            this.xmlParser.parseString(xmlString, (err, result) => {
                if (err) {
                    reject(new ApiException(`Errore durante il parsing XML del certificato: ${err.message}`));
                    return;
                }
                resolve(result);
            });
        });

        let entityList = unpackNestedSignature( entitiesDescriptorObject, entityId , 'SPID');

        return getEntityData(entityList, tag, entityId, new SPIDCertData());
    }

} // FINE CLASSE IdpCertClient




    function getTagsFromInstant(tagList, instant) {
        console.log("[idpCertClient.getTagsFromInstant]");
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
                console.error(`ERROR: Error finding the tags relative to assertion instant ${instant}. Original error: ${e.message}`);
                throw new TagListSearchOutOfBoundException(
                  `Error finding the tags relative to assertion instant ${instant}. Original error: ${e.message}`, e );
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
            console.error(`The given instant ${instant} is not a valid timestamp`);
            throw new InvalidInstantFormatException(`The given instant ${instant} is not a valid timestamp`);
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
    function getEntityData(entityList, tag, entityId, obj) {
        console.log("[idpCertClient.getEntityData]");
        const newData = obj;
        if (!Array.isArray(entityList) ){
            console.error('ERROR: La struttura XML parsata è inattesa o la lista EntityDescriptor è vuota.');
            throw new Error('La struttura XML parsata è inattesa o la lista EntityDescriptor è vuota.');
        }
        for (const entityObj of entityList) {
            if(entityObj !== undefined ){
                newData.entityId = entityId;
                newData.tag = tag;
                newData.certData = entityObj;
                return newData;
            }
        }
        console.error(`ERROR: Cert for entityID ${entityId} not found`);
        throw new EntityIdNotFoundException(`Cert for entityID ${entityId} not found`);
    }


    //@JsonProperty("IDPSSODescriptor")
   function unpackNestedSignature( entitiesDescriptorObject, entityId, tipo) {
        console.log("[idpCertClient.unpackNestedSignature]");
       let nameSpace = '';
       let entitiesDescriptorRoot = entitiesDescriptorObject;
       if(tipo === 'SPID'){
            nameSpace = lollipopConfig.NAMESPACE_TAG;
            entitiesDescriptorRoot = entitiesDescriptorObject[nameSpace + lollipopConfig.ENTITIES_DESCRIPTOR_TAG];
       }
       const entityDescriptors = entitiesDescriptorRoot[nameSpace + lollipopConfig.ENTITY_DESCRIPTOR_TAG];

        let entityDescriptorList = [];
        if (Array.isArray(entityDescriptors)) {
            entityDescriptorList = entityDescriptors
                .filter(el => {
                    return el['$'] && el['$'].entityID === entityId;
            });
        } else if (entityDescriptors && typeof entityDescriptors === 'object') {
            const entityDescriptorsFound = entityDescriptors;
            const currentEntityID = entityDescriptorsFound['$'] ? entityDescriptorsFound['$'].entityID : null;
            if (currentEntityID === entityId) {
                entityDescriptorList.push(entityDescriptorsFound);
            }
        }
        console.log("entityDescriptorList : ", entityDescriptorList[0]);

       const entityDescriptor = entityDescriptorList[0];
       if (entityDescriptor !== undefined && entityDescriptor[nameSpace + lollipopConfig.IDPSSO_DESCRIPTOR_TAG]){

           const idpssoDescriptor = entityDescriptor[nameSpace + lollipopConfig.IDPSSO_DESCRIPTOR_TAG];
           const keyDescriptorsList = getKeyDescriptorsList(idpssoDescriptor, nameSpace + lollipopConfig.KEY_DESCRIPTOR_TAG);

           const keyInfosList = getKeyInfosList(keyDescriptorsList);
           const listX509Data = getListX509Data(keyInfosList);
           const extractedSignatureList = getExtractedSignatureList(listX509Data);
           return extractedSignatureList;
       }else
            throw new ErrorRetrievingIdpCertDataException('La struttura XML parsata è inattesa in quanto manca il tag IDPSSODescriptor');
   }

   function getKeyDescriptorsList(idpssoDescriptor, KeyDescriptor){
        let keyDescriptorsList = [];

        const keyDescriptors = idpssoDescriptor[KeyDescriptor];
        if (Array.isArray(keyDescriptors)) {
            keyDescriptorsList = keyDescriptors
                .filter(el => {
                    return el['$'] && el['$'].use === "signing";
            });
        } else if (keyDescriptors && typeof keyDescriptors === 'object') {
            const keyDescriptorFound = keyDescriptors;
            if (keyDescriptorFound.use === "signing") {
                keyDescriptorsList.push(keyDescriptorFound);
            }
        }
        return keyDescriptorsList;
   }

   function getKeyInfosList(keyDescriptorsList) {
       let keyInfosList = [];

       for (const keyDescriptor of keyDescriptorsList) {
           const keyInfoData = keyDescriptor[lollipopConfig.DS_KEYINFO_TAG];
           if (Array.isArray(keyInfoData)) {
               keyInfosList.push(keyInfoData);
           } else if (keyInfoData) {
               const keyInfo = keyInfoData;
               keyInfosList.push(keyInfo);
           }
       }
       return keyInfosList;
   }


   function getListX509Data(keyInfosList) {
       let listX509Data = [];
       for (const keyInfo of keyInfosList) {
           const x509Data = keyInfo[lollipopConfig.DS_X509DATA_TAG];
           if (Array.isArray(x509Data)) {
               listX509Data.push(x509Data);
           } else if (x509Data) {
               listX509Data.push(x509Data);
           }
       }
       return listX509Data;
   }


  function getExtractedSignatureList(listX509Data) {
       let extractedSignatureList = [];
       for (const x509Data of listX509Data) {
           const x509CertificateContent = x509Data[lollipopConfig.DS_X509CERTIFICATE_TAG];
           if (Array.isArray(x509CertificateContent)) {
               extractedSignatureList.push(x509CertificateContent);
           } else if (x509CertificateContent) {
               extractedSignatureList.push(x509CertificateContent);
           }
       }
       return extractedSignatureList;
   }


module.exports = IdpCertClient;
