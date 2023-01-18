import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import yaml from 'js-yaml';
import { parseTagFromOpenAPIYAML } from "./yamlUtils.js";

export const getMethodTagsFromS3 = async (event, bucket, key) => {
    // Function that collects the S3 object containing the openAPI document and extract
    // the tags of the method invoked
    const s3Object = await getS3Object(bucket, key);
    const yamlDocument = yaml.load(s3Object);
    console.log(yamlDocument);
    const methodTags = parseTagFromOpenAPIYAML(yamlDocument, event);
    console.log(methodTags);
    return methodTags;
};

const getS3Object = (bucket, key) => {
    const s3Client = new S3Client();
    const input = {
        'Bucket': bucket,
        'Key': key
    };
    const command = new GetObjectCommand(input);
    const response = s3Client.send(command)
        .then((data) => {
            console.log(data);
            return data.Body.transformToString(); 
        })
        .catch((err) => {
            throw err;
        });
    return response;
};