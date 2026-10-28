## Policy per cx_type
Le policy (`pfPolicy.json`, `paPolicy.json`, `pgPolicy.json`, `bsPolicy.json`) vengono da pn-bff (`docs/openapi/policies/generated`). La pipeline di deploy le copia in `resource/policies/generated`, cartella non versionata.

Per generarle in locale dall'OpenAPI indicato in `scripts/config.json`:

```
    npm run generate-policies
```

I test usano le fixture in `src/test/resources/policies`, configurate in `src/test/setup.js`.

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


