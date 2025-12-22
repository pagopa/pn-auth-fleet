export async function retryWithDelay<T>(
  fn: () => Promise<T>,
  delay: number,
  retries: number
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, delay));
      return await retryWithDelay(fn, delay, retries - 1);
    } else {
      throw err;
    }
  }
}

async function innerGetAwsParameter(
  name: string,
  isSecret = false
): Promise<string> {
  const token = process.env.AWS_SESSION_TOKEN;

  if (!token) {
    throw new Error("AWS_SESSION_TOKEN is not set");
  }

  const urlPart = isSecret
    ? "secretsmanager/get?secretId="
    : "systemsmanager/parameters/get?name=";
  const url = `http://localhost:2773/${urlPart}${encodeURIComponent(name)}`;

  const response = await fetch(url, {
    headers: {
      "X-Aws-Parameters-Secrets-Token": token,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch parameter: ${response.statusText}`);
  }

  const data = await response.json();

  if (isSecret) {
    return data.SecretString || JSON.stringify(data.SecretBinary);
  }

  return data.Parameter.Value;
}

export async function getAWSParameter(
  parameterName: string,
  isSecret = false
): Promise<string> {
  return await retryWithDelay(
    () => innerGetAwsParameter(parameterName, isSecret),
    1000,
    3
  );
}
