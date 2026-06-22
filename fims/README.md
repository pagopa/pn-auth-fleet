# FIMS Lambda

Lambda Node.js che gestisce il flusso di autenticazione **FIMS**. È pensata per essere
invocata da **app native** (non da browser), quindi **non effettua alcuna verifica
dell'`Origin` e non espone header CORS**. È esposta tramite API Gateway su due endpoint.

## Flusso

```text
App nativa → GET  /fims-authorize → 302 redirect
App nativa → POST /fims-token     → 302 redirect
```

> Gli handler attuali sono **stub**: rispondono solo con un `302`. La logica reale
> (lettura Redis, risoluzione cx id su pn-data-vault, emissione JWT) sarà aggiunta in seguito.

### GET /fims-authorize

Endpoint di avvio del flusso. Per ora restituisce un redirect `302`.

### POST /fims-token

Endpoint di scambio. Per ora restituisce un redirect `302`.

## Dipendenze infrastrutturali

- **Redis**: come la lambda `oidc`, tramite `RedisHandler` di `pn-auth-common`
  (variabili `REDIS_ENDPOINT`, `REDIS_SERVER_NAME`, `USER_ID_REDIS`).
- **pn-data-vault**: come la lambda `lollipopAuthorizer`, tramite
  [src/app/utils/DataVault.ts](src/app/utils/DataVault.ts) (variabile `PN_DATA_VAULT_BASEURL`).
  Per questo la lambda viene deployata nella VPC (subnet confidential).

## Build

Genera `function.zip` nella root del progetto con il codice e le sole dipendenze di produzione.

```sh
npm run build
```

## Test

```sh
npm test
```

Le variabili d'ambiente per i test sono definite in `src/test/test.utils.ts`.

## Test + coverage + sonar + build (CI/CD)

```sh
npm run test-build
```
