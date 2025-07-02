const getCxType = async (token) => {
  const { organization } = token;
  if (!organization) {
    return "PF";
  }

  const { role = "" } = organization;
  return role.startsWith("pg-") ? "PG" : "PA";
};

const getCxId = async (token) => {
  return token.organization ? token.organization.id : "PF-" + token.uid;
};

const getCxRole = async (token) => {
  return token.organization?.role;
};

module.exports = {
  getCxType,
  getCxId,
  getCxRole,
};
