import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
import esmock from "esmock";

chai.use(chaiAsPromised);
const { expect } = chai;

import { verifyHttpSignature } from "../app/verifyHttpSignature.js";
import { validateLollipopHttpSignature } from "../app/lollipopHttpSignatureValidation.js";

import {
  PROD_REQUEST_ID,
  PROD_SIGNATURE,
  PROD_SIGNATURE_INPUT,
  PROD_AUTHORIZER_CONFIG,
  buildProdHeaders,
  buildProdRequest,
  buildProdEvent,
} from "./constants/lollipopProdEventTest.js";

describe(`Caso produzione ${PROD_REQUEST_ID} - alg mismatch JWK/signature-input`, () => {
  let previousAuthorizerConfig;
  let previousLollipopBlock;

  const assertionSuccessStub = () =>
    sinon.stub().resolves({
      resultCode: "SUCCESS",
      name: "Mario",
      familyName: "Rossi",
    });

  const restoreEnv = (name, previousValue) => {
    if (previousValue === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = previousValue;
    }
  };

  before(() => {
    previousAuthorizerConfig = process.env.LOLLIPOP_AUTHORIZER_CONFIG;
    process.env.LOLLIPOP_AUTHORIZER_CONFIG = PROD_AUTHORIZER_CONFIG;

    previousLollipopBlock = process.env.LOLLIPOP_BLOCK;
    process.env.LOLLIPOP_BLOCK = "false";
  });

  after(() => {
    restoreEnv("LOLLIPOP_AUTHORIZER_CONFIG", previousAuthorizerConfig);
    restoreEnv("LOLLIPOP_BLOCK", previousLollipopBlock);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("verifyHttpSignature: la firma della richiesta di produzione deve risultare verificata", async () => {
    const verified = await verifyHttpSignature(
      PROD_SIGNATURE,
      PROD_SIGNATURE_INPUT,
      buildProdHeaders()
    );

    expect(verified).to.be.true;
  });

  it("validateLollipopHttpSignature: deve restituire HTTP_MESSAGE_VALIDATION_SUCCESS", async () => {
    const result = await validateLollipopHttpSignature(buildProdRequest());

    expect(result.resultCode).to.equal("HTTP_MESSAGE_VALIDATION_SUCCESS");
  });

  it("validateLollipopAuthorizer: deve restituire statusCode 200", async () => {
    const validateLollipopAssertion = assertionSuccessStub();

    const { validateLollipopAuthorizer } = await esmock(
      "../app/lollipopAuthorizerValidation.js",
      {
        "../app/lollipopAssertionValidation.js": { validateLollipopAssertion },
      }
    );

    const result = await validateLollipopAuthorizer(buildProdRequest());

    expect(result.statusCode).to.equal(200);
    expect(result.resultCode).to.equal("SUCCESS");
  });

  it("handleEvent: il context della policy IAM deve riportare l'esito di validazione positivo", async function () {
    this.timeout(15000);
    const validateLollipopAssertion = assertionSuccessStub();
    const getCxId = sinon.stub().resolves("PF-c2f92c30-f865-48c5-868f-7f5272e21294");

    const { handleEvent } = await esmock(
      "../app/eventHandler.js",
      { "../app/dataVaultClient.js": { getCxId } },
      { "../app/lollipopAssertionValidation.js": { validateLollipopAssertion } }
    );

    const policy = await handleEvent(buildProdEvent());

    expect(policy.policyDocument.Statement[0].Effect).to.equal("Allow");
    expect(policy.context.resultCode).to.equal("SUCCESS");
  });
});
