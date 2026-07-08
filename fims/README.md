# FIMS Lambda

Lambda Node.js che gestisce il login **FIMS** (SSO di app IO, OIDC Authorization
Code Flow) per conto del cittadino e produce una sessione SEND.

Espone **3 endpoint** su API Gateway. I primi due (`/authorize`, `/token`) fanno
parte del giro OIDC lato server (app nativa / provider) e **non** hanno CORS; il
terzo (`/exchange`) è chiamato dal **frontend cittadini** (browser) e quindi
valida l'`Origin` ed emette gli header CORS.

## Flusso

```text
                 app IO                         FIMS (provider OIDC)         frontend cittadini
                   │                                    │                          │
  GET /authorize   │  302 → FIMS /authorize             │                          │
  ───────────────► │ ─────────────────────────────────►│                          │
                   │           (login + Lollipop)       │                          │
                   │                                    │                          │
  GET /token       │  302 redirect_uri?code&state&iss   │                          │
  (= redirect_uri) │ ◄──────────────────────────────── │                          │
  ───────────────► │  302 → frontend/#fimsToken=<JWT>   │                          │
                   │ ──────────────────────────────────────────────────────────► │
                   │                                    │   POST /exchange         │
                   │                                    │   { authorizationToken } │
                   │                                    │ ◄──────────────────────  │
                   │                                    │   200 { sessionToken, …} │
```

### 1. `GET /authorize` — avvio (app nativa, no CORS)

- genera `state` e `nonce` casuali;
- salva in Redis `pn-session::fims::{state}` → `{ nonce }` con TTL `FIMS_REDIS_STATE_TTL`;
- risponde `302` verso `FIMS_BASEURL/authorize?client_id&response_type=code&scope=openid profile lollipop&redirect_uri&state&nonce`.

Il `client_id` è letto dal secret `FIMS_SECRET_NAME`.

### 2. `GET /token` — callback / `redirect_uri` (app nativa, no CORS)

FIMS, completato il login, redirige qui in **GET** con `code`, `state`, `iss` in
query string (`response_mode=query`). L'handler:

1. verifica `iss == FIMS_ISSUER_URL`;
2. recupera il `nonce` da Redis con lo `state` (valida implicitamente lo state);
3. **token exchange**: `POST FIMS_BASEURL/token` (Basic auth con `client_id`/`client_secret` dal secret) → `access_token` + `id_token`;
4. valida l'`id_token` (alg `RS256`, `iss`, `aud == client_id`, `nonce`, firma via JWKS `FIMS_ISSUER_URL/jwks` con cache `CACHE_TTL`);
5. chiama la **UserInfo** di FIMS → `fiscal_code`, `given_name`, `family_name`, `public_key`, `assertion`, `assertion_ref`;
6. risolve il **cx id** (`uid`) chiamando **pn-data-vault** con il codice fiscale;
7. firma un **`fimsToken`** breve (KMS/RS256, alias `KEY_ALIAS`) con payload
   `{ uid, fiscal_code, given_name, family_name, state, iss, iat, exp }` e TTL `FIMS_TOKEN_TTL`;
8. risponde `302` verso `FIMS_FRONTEND_BASEURL/?utm_…#fimsToken=<JWT>` (il token viaggia nel **fragment**, non arriva al server).

> **Lollipop**: la verifica Proof-of-Possession (checks 1‑7 della guida) è
> **parcheggiata** — vedi il `TODO` nell'handler.

### 3. `POST /exchange` — scambio finale (frontend, con CORS)

Il frontend cittadini, ricevuto il `fimsToken` nel fragment, lo invia qui nel body
`{ "authorizationToken": "<JWT>" }` (stesso campo di `tokenExchange`). L'handler:

1. valida l'`Origin` contro `ALLOWED_ORIGIN` (altrimenti `400`);
2. **valida il `fimsToken`** come fa `jwtAuthorizer` — firma KMS (via
   `kms:GetPublicKey` sul `kid`, cache `CACHE_TTL`) + `exp` — e in più controlla
   `iss == ISSUER` e la presenza dei claim;
3. firma un **session token** long‑lived (stile oidc, KMS, payload
   `{ iat, exp, uid, iss, aud, jti, source }`, TTL `TOKEN_TTL`);
4. risponde `200` con la **stessa forma di `oidc/token`** (builder condiviso
   `buildSessionTokenResponse`): `{ sessionToken, name, family_name,
   fiscal_number, from_aa, level, uid, iss, aud, jti, iat, exp, source }`.

## Variabili d'ambiente

### OIDC / provider FIMS

| Variabile | Descrizione |
|---|---|
| `FIMS_BASEURL` | Base URL del provider FIMS (`/authorize`, `/token`, `/userinfo`). |
| `FIMS_ISSUER_URL` | Issuer atteso nel callback (`iss`) e nell'`id_token`; base della JWKS (`/jwks`). |
| `FIMS_REDIRECT_URI` | `redirect_uri` registrata: punta a `GET /token`. |
| `FIMS_SECRET_NAME` | Nome del secret (Secrets Manager) con `client_id` / `client_secret`. |
| `FIMS_FRONTEND_BASEURL` | Frontend cittadini: destinazione del redirect finale **e** origin ammesso. |
| `FIMS_REDIS_STATE_TTL` | TTL (s) di `state`/`nonce` in Redis (es. `60`). |

### Firma dei token (KMS)

| Variabile | Descrizione |
|---|---|
| `KEY_ALIAS` | Alias della chiave KMS usata per firmare (`fimsToken` e session token). |
| `ISSUER` | Claim `iss` sia del `fimsToken` sia del session token; verificato in `/exchange`. |
| `AUDIENCE` | Claim `aud` del session token di `/exchange`. |
| `FIMS_TOKEN_TTL` | TTL (s) del `fimsToken` breve (es. `60`). |
| `TOKEN_TTL` | TTL (s) del session token long‑lived (come oidc). |
| `CACHE_TTL` | TTL (s) della cache delle chiavi pubbliche (JWKS di FIMS e public key KMS). |

### CORS / frontend

| Variabile | Descrizione |
|---|---|
| `ALLOWED_ORIGIN` | Origin ammesso su `/exchange` (= `FIMS_FRONTEND_BASEURL`). |

### Infra (VPC)

| Variabile | Descrizione |
|---|---|
| `PN_DATA_VAULT_BASEURL` | Base URL di pn-data-vault per risolvere il cx id (subnet confidential). |
| `REDIS_ENDPOINT`, `REDIS_SERVER_NAME`, `USER_ID_REDIS` | Connessione Redis (usate da `RedisHandler` di `pn-auth-common`). |

### Verifica Lollipop / assertion (in lavorazione)

| Variabile | Descrizione |
|---|---|
| `IDP_CONFIG_BASE_URI` | Base URI dei metadata degli IdP SPID/CIE per validare l'assertion SAML. |
| `IDP_CLIENT_CIEIDD` | Identificativo client CIE id. |
| `IDP_HTTP_TIMEOUT_MS` | Timeout (ms) delle chiamate ai metadata IdP. |
| `ASSERTION_EXPIRE_IN_DAYS` | Finestra di validità dell'assertion (giorni). |

> Le variabili sono valorizzate dal CFN in `scripts/aws/cfn/microservice.yml`
> (risorsa `FimsLambda`). Per i test sono definite in `src/test/test.utils.ts`.

## Dipendenze infrastrutturali

- **Redis**: come `oidc`, tramite `RedisHandler` di `pn-auth-common`.
- **pn-data-vault**: come `lollipopAuthorizer`, tramite
  [src/app/utils/DataVault.ts](src/app/utils/DataVault.ts); per questo la lambda
  è deployata nella VPC (subnet confidential).
- **KMS**: firma dei token (`kms:Sign` / `kms:DescribeKey`) e verifica del
  `fimsToken` (`kms:GetPublicKey`), condivisa con `jwtAuthorizer` via
  `pn-auth-common` (`KmsJwtVerifier`).

## Build

Genera `function.zip` nella root con il codice e le sole dipendenze di produzione.

```sh
npm run build
```

## Test

```sh
npm test
```

Le variabili d'ambiente per i test sono in `src/test/test.utils.ts`.

## Test + coverage + sonar + build (CI/CD)

```sh
npm run test-build
```
