# WebLogout

API autenticata tramite `jwtAuthorizer` invocata dal frontend al logout.
Il token viene scritto in Redis per essere invalidato.

N.B.
Il file `env.test` è usato solo per i test. Le variabile d'ambiente della lambda sono iniettate dallo script del microservice.

## Build

Il comando di seguito genera lo zip `function.zip` contenente il codice della lambda comprensivo di tutte le dipendenze

```script
npm run build
```

## Esecuzione test

```script
npm test
```

## Esecuzione test, coverage, sonar e build per pipeline

Comando eseguito dalla pipeline

```script
npm run test-build
```
