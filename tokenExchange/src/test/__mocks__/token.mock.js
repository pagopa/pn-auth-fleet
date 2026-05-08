const supportToken = {
  uid: "12345678",
  email: "support@mail.com",
  iss: "PAGOPA",
  aud: "selfcare.uat.notifichedigitali.it",
  iat: 1772192770,
  exp: 1772193670,
  jti: "b75050c8-63f3-5830-83bd-6c65c57d3474",
  organization: {
    id: "5b994d4a-0fa8-47ac-9c7b-354f1d44a1ce",
    name: "Comune di Palermo",
    roles: [
      {
        partyRole: "SUPPORT",
        role: "support",
      },
    ],
    fiscal_code: "80016350821",
    ipaCode: "c_g273",
  },
  desired_exp: 1803628800,
  sub: "12345678",
  typ: "ID",
};

module.exports = {
  supportToken,
};
