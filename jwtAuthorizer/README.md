## Policy per cx_type
Le policy (`pfPolicy.json`, `paPolicy.json`, `pgPolicy.json`, `bsPolicy.json`) vengono da pn-bff (`docs/openapi/policies/generated`). La pipeline di deploy le copia in `resource/policies/generated`, cartella non versionata.

Le policy sono generate dal `policyGenerator` di pn-codegen a partire dal tag `x-pn-allowed-cx-types` dell'OpenAPI del BFF.

I test usano le fixture in `src/test/resources/policies`, configurate in `src/test/setup.js`.

### Casi speciali
Alcune API WEB protette dal `jwtAuthorizer` hanno un gateway dedicato e non sono coperte dalle policy del BFF:

- **Logout**: riconosciuta dal `restApiId` (`WEB_LOGOUT_REST_API_ID`), restituisce `logoutPolicy.json` per tutti i `cx_type`.
- **Richiesta supporto Zendesk** (`pn-zendesk-auth`): riconosciuta da metodo e path (`POST /new-support-request`), restituisce `zendeskPolicy.json` solo per `PF` e una policy di deny per gli altri `cx_type`.

## Esecuzione build

Il comando di seguito genera uno zip nella directory build contenente tutte e sole le dipendenze necessarie all'ambiente di produzione

```
    npm run-script build
```
## Esecuzione test
Il comando di seguito permette di eseguire tutti i test previsti

```
    npm test
```

## Esecuzione test e build
Il comando di seguito permette di eseguire la routine dei test per poi generare lo zip di build

```
    npm run-script test-build
```

## Handler
L'handler della lambda è presente nel file index.js


