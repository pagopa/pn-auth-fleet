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


## Creazione nuovo AttributeResolver
Aggiornare il file di configurazione `src/app/config/attributeResolversCfg.json`, aggiungendo il nuovo elemento che avrà come chiave il nome dell'AttributeResolver e come attributo obbligatorio il `fileName` ossia, il nome del file che esporterà la funzione di risoluzione.

**Nota** Il path del file è relativo alla directory `src/app/modules/attributeResolvers`.
