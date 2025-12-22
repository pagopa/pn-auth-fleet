# Token Exchange V2

Questa lambda si occupa di eseguire la token exchange andando a scambiare il codice OIDC ricevuto da One Identity con un token JWT che permette l'accesso alle piattaforme frontend di SEND.

## Variabili di ambiente

Il file `.env.test` viene usato solamente per l'esecuzione dei test locali.

Creare un file `.env.test` nella root del progetto settando le seguenti variabili d'ambiente:

- KEY_ALIAS
- CACHE_TTL
- TOKEN_TTL
- ISSUER
- ALLOWED_ISSUER
- ALLOWED_ORIGIN
- ALLOWED_ROLES
- ALLOWED_TAXIDS_PARAMETER
- ACCEPTED_AUDIENCE
- AUDIENCE
- \_X_AMZN_TRACE_ID
- ONE_IDENTITY_CLIENT_ID
- ONE_IDENTITY_CLIENT_SECRET_ID
- ONE_IDENTITY_BASEURL

## Build

Il comando di seguito genera uno zip (`function.zip`) nella root del progetto contenente il codice della lambda e sole le dipendenze necessarie all'ambiente di produzione.

```script
npm run build
```

## Esecuzione test

Il comando di seguito permette di eseguire tutti i test previsti

```script
npm test
```

## Esecuzione test, coverage, sonar e build

```script
npm run test-build
```

N.B. Questo comando viene eseguito dalla pipeline CI/CD
