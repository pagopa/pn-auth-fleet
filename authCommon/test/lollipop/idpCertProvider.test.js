const { DOMParser } = require("@xmldom/xmldom");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const rewire = require("rewire");

chai.use(chaiAsPromised);

const { expect } = chai;
const LollipopValidationError = require("../../app/modules/lollipop/LollipopValidationError");

const {
  spidXmlOneKeyDescriptor,
  cieXmlTwoKeyDescriptors,
} = require("./fixtures/idpMetadata");

const spidEntityId = "https://posteid.poste.it";
const cieEntityId =
  "https://idserver.servizicie.interno.gov.it/idp/profile/SAML2/POST/SSO";

const baseUrl = "https://idp-config.example.test";

function buildAssertionDocument(
  issuer = spidEntityId,
  issueInstant = "2024-01-20T00:00:00.000Z",
) {
  return new DOMParser().parseFromString(
    `
      <saml:Assertion
        xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
        IssueInstant="${issueInstant}">
        <saml:Issuer>${issuer}</saml:Issuer>
      </saml:Assertion>
    `,
    "application/xml",
  );
}

function buildAxiosMock(responses) {
  const calls = [];

  return {
    calls,
    get: async (url, options) => {
      calls.push({ url, options });

      if (!(url in responses)) {
        throw new Error(`Unexpected URL: ${url}`);
      }

      return { data: responses[url] };
    },
  };
}

function loadProviderWithAxiosMock(axiosMock) {
  const provider = rewire("../../app/modules/lollipop/idpCertProvider.js");

  provider.__set__("axios", axiosMock);

  return provider;
}

describe("idpCertProvider", () => {
  const idpConfig = {
    baseUrl,
    cieEntityIds: [],
    timeoutMs: 1200,
  };

  it("retrieves the two source-faithful SPID metadata versions around the assertion instant", async () => {
    const upperTag = "1710000000";
    const lowerTag = "1700000000";

    const axiosMock = buildAxiosMock({
      [`${baseUrl}/idp-keys/spid`]: [lowerTag, upperTag, "latest"],
      [`${baseUrl}/idp-keys/spid/${upperTag}`]: Buffer.from(
        spidXmlOneKeyDescriptor,
        "utf8",
      ),
      [`${baseUrl}/idp-keys/spid/${lowerTag}`]: Buffer.from(
        spidXmlOneKeyDescriptor,
        "utf8",
      ),
    });

    const { getIdpCertData } = loadProviderWithAxiosMock(axiosMock);

    const certificates = await getIdpCertData(
      buildAssertionDocument(),
      idpConfig,
    );

    expect(certificates).to.deep.equal([
      {
        entityId: spidEntityId,
        tag: upperTag,
        certData: ["POSTE_SIGNING_CERT_CONTENT"],
      },
      {
        entityId: spidEntityId,
        tag: lowerTag,
        certData: ["POSTE_SIGNING_CERT_CONTENT"],
      },
    ]);

    expect(axiosMock.calls[0]).to.deep.include({
      url: `${baseUrl}/idp-keys/spid`,
      options: {
        timeout: 1200,
        headers: {
          Accept: "application/json",
        },
        responseType: "json",
      },
    });

    expect(axiosMock.calls[1].options).to.deep.equal({
      timeout: 1200,
      headers: {
        Accept: "application/xml, application/json",
      },
      responseType: "arraybuffer",
    });
  });

  it("retrieves CIE signing certificates when the assertion issuer is configured as a CIE entity ID", async () => {
    const upperTag = "1710000000";
    const lowerTag = "1700000000";
    const cieIdpConfig = {
      ...idpConfig,
      cieEntityIds: [cieEntityId],
    };

    const axiosMock = buildAxiosMock({
      [`${baseUrl}/idp-keys/cie`]: [lowerTag, upperTag, "latest"],
      [`${baseUrl}/idp-keys/cie/${upperTag}`]: Buffer.from(
        cieXmlTwoKeyDescriptors,
        "utf8",
      ),
      [`${baseUrl}/idp-keys/cie/${lowerTag}`]: Buffer.from(
        cieXmlTwoKeyDescriptors,
        "utf8",
      ),
    });

    const { getIdpCertData } = loadProviderWithAxiosMock(axiosMock);

    const certificates = await getIdpCertData(
      buildAssertionDocument(cieEntityId),
      cieIdpConfig,
    );

    expect(certificates).to.deep.equal([
      {
        entityId: cieEntityId,
        tag: upperTag,
        certData: ["CIE_SIGNING_CERT_CONTENT"],
      },
      {
        entityId: cieEntityId,
        tag: lowerTag,
        certData: ["CIE_SIGNING_CERT_CONTENT"],
      },
    ]);

    expect(axiosMock.calls.map((call) => call.url)).to.deep.equal([
      `${baseUrl}/idp-keys/cie`,
      `${baseUrl}/idp-keys/cie/${upperTag}`,
      `${baseUrl}/idp-keys/cie/${lowerTag}`,
    ]);
  });

  it("fails closed when the IDP key service returns no tags", async () => {
    const axiosMock = buildAxiosMock({
      [`${baseUrl}/idp-keys/spid`]: [],
    });

    const { getIdpCertData } = loadProviderWithAxiosMock(axiosMock);

    await expect(getIdpCertData(buildAssertionDocument(), idpConfig))
      .to.be.rejectedWith(LollipopValidationError)
      .and.eventually.have.property(
        "errorCode",
        "IDP_CERT_DATA_RETRIEVING_ERROR",
      );
  });
});
