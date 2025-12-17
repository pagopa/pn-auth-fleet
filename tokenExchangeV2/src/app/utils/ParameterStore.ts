async function retryWithDelay(
  fn: () => Promise<string>,
  delay: number,
  retries: number
): Promise<string> {
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

async function innerGetParameterFromStore(
  parameterName: string
): Promise<string> {
  try {
    const token = process.env.AWS_SESSION_TOKEN;

    // Throw error if token is not set
    if (!token) {
      throw new Error("AWS_SESSION_TOKEN is not set");
    }

    const response = await fetch(
      `http://localhost:2773/systemsmanager/parameters/get?name=${encodeURIComponent(
        parameterName
      )}`,
      {
        headers: {
          "X-Aws-Parameters-Secrets-Token": token,
        },
      }
    );

    const data = await response.json();

    return data.Parameter.Value;
  } catch (err) {
    console.warn("Error in get parameter ", err);
    throw new Error("Error in get parameter");
  }
}

export async function getParameterFromStore(
  parameterName: string
): Promise<string> {
  return await retryWithDelay(
    () => innerGetParameterFromStore(parameterName),
    1000,
    3
  );
}
