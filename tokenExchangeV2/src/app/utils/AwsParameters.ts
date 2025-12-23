import { retryWithDelay } from "./Retry";

/**
 * Retrieves an AWS Parameter Store parameter or Secrets Manager secret with retries
 *
 * @param parameterName - The name of the parameter or secret to fetch
 * @param isSecret - Whether to fetch from Secrets Manager (true) or Parameter Store (false)
 */
export async function getAWSParameter(
  parameterName: string,
  isSecret = false
): Promise<string> {
  return retryWithDelay(
    () => fetchAwsParameter(parameterName, isSecret),
    1000,
    3
  );
}

// Fetches a parameter or secret from AWS Parameter Store or Secrets Manager
const fetchAwsParameter = async (
  name: string,
  isSecret = false
): Promise<string> => {
  const sessionToken = process.env.AWS_SESSION_TOKEN;

  if (!sessionToken) {
    throw new Error("AWS_SESSION_TOKEN is not set");
  }

  const endpoint = isSecret
    ? `secretsmanager/get?secretId=${encodeURIComponent(name)}`
    : `systemsmanager/parameters/get?name=${encodeURIComponent(name)}`;

  const url = `http://localhost:2773/${endpoint}`;

  const response = await fetch(url, {
    headers: {
      "X-Aws-Parameters-Secrets-Token": sessionToken,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${isSecret ? "secret" : "parameter"} "${name}": ${
        response.status
      } ${response.statusText}`
    );
  }

  const data = await response.json();

  if (isSecret) {
    return data.SecretString || JSON.stringify(data.SecretBinary);
  }

  return data.Parameter.Value;
};
