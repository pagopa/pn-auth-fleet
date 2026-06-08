# TokenExchange

Lambda che implementa il flusso di token exchange per Piattaforma Notifiche. Riceve un token di autenticazione esterno (emesso da SPID Hub o SelfCare), ne valida issuer, audience, algoritmo e ruolo, arricchisce il payload con le informazioni dell'utente e genera un session token firmato tramite KMS da restituire al frontend. Supporta anche il canale TPP, recuperando il payload di retrieval da pn-emd-integration prima di generare il token.

## Variabili d'ambiente

### Configurate in `microservice-dev-cfg.json`

| Variabile | Parametro CFN | Descrizione |
| --- | --- | --- |
| `CACHE_TTL` | `TokenExchangeLambdaEnvironmentCacheTtl` | TTL in secondi della cache JWKS (default: 300) |
| `TOKEN_TTL` | `TokenExchangeLambdaEnvironmentTokenTtl` | Durata in secondi del session token generato |

### Iniettate da `pn-infra-core` (output Terraform)

| Variabile | Parametro CFN | Valore |
| --- | --- | --- |
| `ISSUER` | `TokenExchangeLambdaEnvironmentIssuer` | `https://webapi.<dns_zone>` |
| `ALLOWED_ISSUER` | `TokenExchangeLambdaEnvironmentAllowedIssuer` | `https://hub-login.spid.<dns_zone>,<pn_auth_fleet_addictive_allowed_issuer>` |
| `ALLOWED_ORIGIN` | `TokenExchangeLambdaEnvironmentAllowedOrigin` | `Core_CorsAllowedDomains` |
| `ACCEPTED_AUDIENCE` | `TokenExchangeLambdaEnvironmentAcceptedAudience` | `Core_CdnDomains` |
| `AUDIENCE` | `TokenExchangeLambdaEnvironmentAudience` | `webapi.<dns_zone>` |
| `JWKS_MAPPING` | `TokenExchangeLambdaEnvironmentJwksMapping` | `{}` |
| `ALLOWED_TAXIDS_PARAMETER` | `TokenExchangeLambdaEnvironmentAllowedTaxIdsParameter` | Path nel Parameter Store contenente la whitelist dei codici fiscali. Default: `/pn-auth-fleet/allowedLoginTaxids`. Il valore del parametro può essere: `*` (tutti validi), lista di codici fiscali separati da virgola, oppure `*` + codici fiscali preceduti da `!` e separati da virgola (blacklist). |

### Derivate da risorse interne allo stack CFN

| Variabile | Sorgente CFN | Descrizione |
| --- | --- | --- |
| `KEY_ALIAS` | `!Ref PnAuthFleetJwtSignKeyAlias` | Alias della chiave KMS usata per firmare il session token |
| `PN_EMD_INTEGRATION_BASEURL` | `!Sub "http://${ApplicationLoadBalancerDomain}:8080"` | Base URL del servizio pn-emd-integration |

### Iniettate dal runtime Lambda (non configurare manualmente)

| Variabile | Descrizione |
| --- | --- |
| `AWS_SESSION_TOKEN` | Token di sessione AWS |
| `_X_AMZN_TRACE_ID` | Trace ID X-Ray |

---

## Esecuzione build

Il comando di seguito genera uno zip nella directory build contenente tutte e sole le dipendenze necessarie all'ambiente di produzione

```bash
npm run-script build
```

## Esecuzione test

Il comando di seguito permette di eseguire tutti i test previsti

```bash
npm test
```

## Esecuzione codecoverage

Il comando di seguito permette di eseguire la code coverage dopo l'esecuzione dei test

```bash
npm run-script coverage
```

## Esecuzione test, coverage, sonar e build

Il comando di seguito permette di eseguire la routine dei test per poi generare lo zip di build

```bash
npm run-script test-build
```

---

## Handler

L'handler della lambda è presente nel file `index.js`.
