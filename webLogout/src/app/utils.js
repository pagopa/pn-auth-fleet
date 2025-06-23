const getCxType = async (token) => {
  if (token.organization) {
    return "PA";
  }
  if (token.organization?.roles[0]?.role.startsWith("pg-")) {
    return "PG";
  }
  return "PF";
};

const getCxId = async (token) => {
  return token.organization ? token.organization.id : "PF-" + token.uid;
};

const getCxRole = async (token) => {
  return token.organization?.roles[0]?.role;
};

module.exports = {
  getCxType,
  getCxId,
  getCxRole,
};
