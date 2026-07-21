# OIDC Lambda

Lambda Node.js che implementa il flusso OIDC con One Identity per l'autenticazione degli utenti CITTADINI su SEND. Esposta tramite API Gateway su due endpoint.

## Flusso

```text
Frontend → GET /oidc/authorize → redirect a One Identity
One Identity → POST /oidc/token → scambia il codice OIDC con un JWT SEND
```

### GET /oidc/authorize

Riceve `idp` (obbligatorio), `aar` e `retrievalId` (opzionali) come query string. Genera `state` e `nonce` come UUID v4, li salva in Redis con TTL configurabile, e restituisce la URL di redirect verso One Identity.

### POST /oidc/token

Riceve `code` e `state` (obbligatori, validati da API Gateway). Legge da Redis i dati associati allo `state` (`nonce`, `idp`, `aar`, `retrievalId`): se lo state non esiste risponde 400. Esegue la token exchange con One Identity, valida l'`id_token` usando il `nonce` letto da Redis, genera il JWT SEND e invalida la chiave Redis dello state. In caso di errore la chiave Redis viene comunque eliminata (nel `finally`).

La `source` viene derivata dai dati Redis: `retrievalId` presente → tipo `TPP` (pagamento via app bancaria); `aar` presente → tipo `QR` (QR code); altrimenti assente. Il JWT di risposta include anche `idp`, `aar` e `retrievalId` letti dallo state Redis.

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
