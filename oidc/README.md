# OIDC Lambda

Lambda Node.js che implementa il flusso OIDC con One Identity per l'autenticazione degli utenti CITTADINI su SEND. Esposta tramite API Gateway su tre endpoint.

## Flusso

```text
Frontend → GET /oidc-authorize → redirect a One Identity
One Identity → GET /oidc-state → recupera nonce e dati dalla sessione Redis
One Identity → POST /oidc-token → scambia il codice OIDC con un JWT SEND
```

### GET /oidc-authorize

Riceve `idp` (obbligatorio), `aar` e `retrievalId` (opzionali) come query string. Genera `state` e `nonce` come UUID v4, li salva in Redis con TTL configurabile, e restituisce la URL di redirect verso One Identity.

### GET /oidc-state

Riceve `state` come query string (UUID v4). Legge da Redis i dati associati allo state (`nonce`, `idp`, `aar`, `retrievalId`) e li restituisce al chiamante (One Identity).

### POST /oidc-token

Riceve `code`, `nonce`, `state` (obbligatori, validati da API Gateway) e `source` (opzionale). Esegue la token exchange con One Identity, valida l'`id_token` ricevuto, genera il JWT SEND e invalida la chiave Redis dello state. In caso di errore, la chiave Redis viene comunque eliminata (nel `finally`).

Il campo `source` può avere tipo `TPP` (pagamento via app bancaria) o `QR` (QR code). In entrambi i casi viene risolto in un oggetto `source` nel token di risposta.

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
