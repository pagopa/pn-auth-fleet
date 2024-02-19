## Creazione file .env
Creare il file _.env_ nella root del progetto settando le seguenti variabili d'ambiente:
- KEY_ID
- CACHE_TTL

Esempio file .env:
```
    CACHE_TTL=3600
```

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


