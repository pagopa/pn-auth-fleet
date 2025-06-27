const getCxType = async (token) => {
  const { organization } = token;
  if (!organization) {
    return "PF";
  }

  const { roles = [] } = organization;
  if (roles && roles.length > 0 && roles[0].role.startsWith("pg-")) {
    return "PG";
  }

  return "PA";
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
