# Lollipop Authorizer

Modulo Node.js per la **validazione delle richieste** con intestazioni JWK codificate in base64Url, utilizzate nel contesto di autenticazioni di Assertion.

---
## 1) requestValidation.js
### Funzionalità

- Decodifica e valida chiavi pubbliche codificate in base64url
- Supporto per:
  - Chiavi EC (`kty: EC`, `crv: P-256`)
  - Chiavi RSA (`kty: RSA`)
- Gestione di errori personalizzati con codici standardizzati

---

### Struttura del modulo
```
lollipopAuthorizer/
├── app/
│   ├── exception/
│   │   └── lollipopRequestContentValidationException.js
│   └── requestValidation.js
└── test/
    └── requestValidation.test.js
```


---

### Installazione

Installare le dipendenze:

```bash
npm install
```
Per i test:
```
npm install --save-dev mocha chai
npm install jose base64url
npm install --save-dev chai-as-promised 
```
### Esecuzione dei test
Avviare i test con:

```
npx mocha test/requestValidation.test.js
```
Oppure, per lanciarli tutti:
```
npm test
```