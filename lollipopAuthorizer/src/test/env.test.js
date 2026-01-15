import chai from "chai";
// test utile solo per  testare la valorizzazione del .env
describe('ENV TEST ', () => {

    it('Legge le variabili da .env.test', () => {
        console.log("PARAMETRIZZAZIONE DELLA VAR ASSERTION_EXPIRE_IN_DAYS:", process.env.ASSERTION_EXPIRE_IN_DAYS);
       expect(process.env.ASSERTION_EXPIRE_IN_DAYS).to.not.be.null;
    });

});
