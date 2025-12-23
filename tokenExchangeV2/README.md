# Token Exchange V2

Questa lambda si occupa di eseguire la token exchange andando a scambiare il codice OIDC ricevuto da One Identity con un token JWT che permette l'accesso alle piattaforme frontend di SEND.

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

In locale le variabili di ambiente necessarie per l'esecuzione dei test possono essere definite nel file `./src/test/test.utils.ts`

## Esecuzione test, coverage, sonar e build

```script
npm run test-build
```

N.B. Questo comando viene eseguito dalla pipeline CI/CD
