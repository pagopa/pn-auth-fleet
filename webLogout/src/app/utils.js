const axios = require("axios");

const getCxType = (token) => {
  const { organization } = token;
  if (!organization) {
    return "PF";
  }

  const { role = "" } = organization;
  return role.startsWith("pg-") ? "PG" : "PA";
};

const getCxId = (token) => {
  return token.organization ? token.organization.id : "PF-" + token.uid;
};

const getCxRole = (token) => {
  return token.organization?.role;
};

// function to retry async function with a delay
async function retryWithDelay(fn, delay, retries) {
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

async function innerGetParameterFromStore(parameterName) {
  try {
    const response = await axios.get(
      `http://localhost:2773/systemsmanager/parameters/get?name=${encodeURIComponent(
        parameterName
      )}`,
      {
        headers: {
          "X-Aws-Parameters-Secrets-Token": process.env.AWS_SESSION_TOKEN,
        },
      }
    );
    return response.data.Parameter.Value;
  } catch (err) {
    console.warn("Error in get parameter ", err);
    throw new Error("Error in get parameter");
  }
}

async function getParameterFromStore(parameterName) {
  return await retryWithDelay(
    () => innerGetParameterFromStore(parameterName),
    1000,
    3
  );
}

module.exports = {
  getCxType,
  getCxId,
  getCxRole,
  getParameterFromStore,
};