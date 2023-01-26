const UrlPattern = require('url-pattern');

function getMatchingElement(yamlDocument, openApiPath, httpMethod){
    for (const [path, element] of Object.entries(yamlDocument)) {
        const transformedPath = path.replaceAll('{', ':').replaceAll('}', '')
        const pt = new UrlPattern(transformedPath)
        if(pt.match(openApiPath)){
            return element[httpMethod]
        }
    }

    return null
}

const parseTagFromOpenAPIYAML = (yamlDocument, event) => {
    const yamlMethodElement = getMatchingElement(yamlDocument['paths'], event.openApiPath, event.httpMethod.toLowerCase());
    if(!yamlMethodElement) {
        console.log(`No matching path for path ${event.openApiPath} and method ${event.httpMethod} `);
        return [];
    }

    const methodTags = yamlMethodElement['tags'];
    if (methodTags === undefined) {
        console.log(`No Tags found in path ${event.openApiPath} and method ${event.httpMethod}`);
        return [];
    } else {
        console.log(`method tags: ${methodTags}`);
        return methodTags;
    }
};

module.exports = {
    parseTagFromOpenAPIYAML
}