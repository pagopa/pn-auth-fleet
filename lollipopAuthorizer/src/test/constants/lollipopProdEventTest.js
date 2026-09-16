const PROD_REQUEST_ID = "de4b2ad3-374e-4ebe-bb69-167efb831b09";

const PROD_PUBLIC_KEY_B64 = "eyJlIjoiQVFBQiIsIm4iOiJBSXFDZS9PbjI3YVpCb01OUjQ5S29vdytLRFgxRExSS0svcWxnNkRsZngzN2lOTXFwa0pDK2w3STA3SjQ2QmtoQnQxUFIxdk8yNUJCWGRORXJhalNoaTVBS0tCdlJuRWgxY0FwY2tlSU9QMjU1NDRpZUxhQXFkM1kwYnU0TC85YkwrdGtqK0psKzNON0JoS1JXQ3FrUzd1RENDQWJoSlNmOVBTKy9sM1NtUFVteVVqZkp0V0s2SENMdXRMbVVIa2ZiT2U0cURKNmJ2RGVabGREczZlWHpuNC9JRDMzSlEwQmRxejd5MTF6ak1zZlZQY0YvR0x6QmN5ajNzamJIMTBBRVh0L08xd044Z3hWQ2dFMXpmNHY4VS8xVVdDTWpKSWxzQk5EUmowVXZURXM3M3RZRzNnT2cvQS9MTjZ0WXd3K2dzRndqM0tNUDZKOEJUSENFbFhQby9rPSIsImFsZyI6IlJTMjU2Iiwia3R5IjoiUlNBIn0";

const PROD_SIGNATURE_INPUT = "sig1=(\"x-pagopa-lollipop-original-method\" \"x-pagopa-lollipop-original-url\");created=1788987092;nonce=\"7c1ada8e-dd82-45ce-a012-87cf188d2df6\";alg=\"rsa-pss-sha256\";keyid=\"3c42r3lxSt_xTd-dzaQBnWYzAsQkw6dqJly0wpYWSFE\"";

const PROD_SIGNATURE = "sig1=:UO+zm+y1brdaX42DlrI5lB8EFCgMiJA4ix1+fgd7+YpxgDGTeqs+avGj4PcSg6a4++r0FEWwAApSQ4owmHtJVsRQGMzYlNMxxLke3zqMMhwIEy6xaP2NzYMRGF2KfOaLiqZd2bps/QQBjayNmPO+qV8dBP7EkZ6Qmk7ME0z7kvgACiSJzFu9JRxRsf7Sj/iNRmhrPeJ7ICMfcIJ//YZMBZrcoxHks2VmcF3Ww1fgWxHCvXEApxlixCcet2eJgc135sOkMhBa46okAJjOyIbMwvWOpxKsz8uo8PPWSQrw9mHDAnf8cYRoq5D7Oqz3HUjM4Rw6/f3FhmR5rF2qAa1vRA==:";

const PROD_ASSERTION_REF = "sha256-3c42r3lxSt_xTd-dzaQBnWYzAsQkw6dqJly0wpYWSFE";

const PROD_ORIGINAL_METHOD = "GET";

const PROD_ORIGINAL_URL =
  "https://api-app.io.pagopa.it/api/communication/v1/third-party-messages/01M22ER19NFWQBMY0N4RSKT4XK/precondition";

const PROD_ASSERTION_TYPE = "SAML";
const PROD_AUTH_JWT = "aValidJWT";
const PROD_TAX_ID = "AAAAAA89S20I111X";

const PROD_PATH = "/io/v1/notification-disclaimer/XJKT-NXWT-DYXE-202609-J-1";
const PROD_METHOD_ARN =
  "arn:aws:execute-api:eu-south-1:510769970275:7cw90rxda7/unique/GET/io/v1/notification-disclaimer/XJKT-NXWT-DYXE-202609-J-1";

const PROD_AUTHORIZER_CONFIG = JSON.stringify([
  {
    substringURL: "/notification-disclaimer/",
    methods: ["GET"],
    URLpattern:
      "^https://api-app.io.pagopa.it/api/(v1|communication/v1)/third-party-messages/[a-zA-Z0-9]{26}/precondition$",
  },
]);

function buildProdHeaders(overrides = {}) {
  return {
    "x-pagopa-lollipop-public-key": PROD_PUBLIC_KEY_B64,
    "x-pagopa-lollipop-assertion-ref": PROD_ASSERTION_REF,
    "x-pagopa-lollipop-assertion-type": PROD_ASSERTION_TYPE,
    "x-pagopa-lollipop-auth-jwt": PROD_AUTH_JWT,
    "x-pagopa-lollipop-user-id": PROD_TAX_ID,
    "x-pagopa-lollipop-original-method": PROD_ORIGINAL_METHOD,
    "x-pagopa-lollipop-original-url": PROD_ORIGINAL_URL,
    "x-pagopa-cx-taxid": PROD_TAX_ID,
    "signature-input": PROD_SIGNATURE_INPUT,
    signature: PROD_SIGNATURE,
    ...overrides,
  };
}

function buildProdRequest(headerOverrides = {}) {
  return {
    path: PROD_PATH,
    headerParams: { headers: buildProdHeaders(headerOverrides) },
  };
}

function buildProdEvent(headerOverrides = {}) {
  return {
    path: PROD_PATH,
    methodArn: PROD_METHOD_ARN,
    headers: buildProdHeaders(headerOverrides),
  };
}

export {
  PROD_REQUEST_ID,
  PROD_PUBLIC_KEY_B64,
  PROD_SIGNATURE_INPUT,
  PROD_SIGNATURE,
  PROD_ASSERTION_REF,
  PROD_ORIGINAL_METHOD,
  PROD_ORIGINAL_URL,
  PROD_ASSERTION_TYPE,
  PROD_AUTH_JWT,
  PROD_TAX_ID,
  PROD_PATH,
  PROD_METHOD_ARN,
  PROD_AUTHORIZER_CONFIG,
  buildProdHeaders,
  buildProdRequest,
  buildProdEvent,
};
