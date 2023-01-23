const parseTagFromOpenAPIYAML = (yamlDocument, event) => {
    const methodTags = yamlDocument['paths'][event.path][event.httpMethod.toLowerCase()]['tags'];
    if (methodTags === undefined) {
        console.log(`No Tags found in path ${event.path} and method ${event.httpMethod}`);
        return [];
    } else {
        console.log(`method tags: ${methodTags}`);
        return methodTags;
    }
};

module.exports = {
    parseTagFromOpenAPIYAML
}