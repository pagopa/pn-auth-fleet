import { retryWithDelay } from "./Retry";

const RETRY_DELAY_MS = 1000;
const MAX_RETRIES = 3;

type ParameterType = "parameter" | "secret";

/**
 * Retrieves an AWS Parameter Store parameter with retries
 *
 * @param parameterName - The name of the parameter to fetch
 */
export async function getAWSParameterStore(
  parameterName: string
): Promise<string> {
  return retryWithDelay(
    () => fetchAwsParameter(parameterName, "parameter"),
    RETRY_DELAY_MS,
    MAX_RETRIES
  );
}

/**
 * Retrieves an AWS Secrets Manager secret with retries
 *
 * @param parameterName - The name of the secret to fetch
 */
export async function getAWSSecret(secretName: string): Promise<string> {
  return retryWithDelay(
    () => fetchAwsParameter(secretName, "secret"),
    RETRY_DELAY_MS,
    MAX_RETRIES
  );
}

// Fetches a parameter or secret from AWS Parameter Store or Secrets Manager
const fetchAwsParameter = async (
  name: string,
  type: ParameterType
): Promise<string> => {
  const isSecret = type === "secret";
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
