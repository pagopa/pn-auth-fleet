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

## Errori di connessione durante il refresh

Per gli errori Axios con codice `ECONNREFUSED` o `ETIMEDOUT`, il campo
`retryAttempt` del record CFG dell'issuer conta i fallimenti in modo persistente.
Il contatore e unico per issuer anche quando i due codici si alternano; un campo
assente equivale a zero.

Per default i primi tre fallimenti producono log `WARN`; il quarto e i successivi
producono `ERROR`. Ogni fallimento mantiene la ripianificazione e l'intervallo configurato
con `JWKS_DOWNLOAD_RETRY_INTERVAL_MINUTES`, senza tentativi immediati aggiuntivi.
Il contatore viene incrementato atomicamente insieme alla ripianificazione.

Un refresh riuscito azzera il contatore nella stessa transazione che salva la
cache, anche se eseguito dal refresh forzato o dalla gestione degli issuer.
Gli altri errori restano immediatamente `ERROR` e non modificano il contatore;
altri codici di timeout, come `ECONNABORTED`, non sono inclusi nella soglia.
I fallimenti della persistenza non vengono attenuati.

### Soglia configurabile

Il parametro CloudFormation `JWKSConnectionErrorWarningThreshold` in
`scripts/aws/cfn/microservice.yml` viene passato alla Lambda come variabile
`JWKS_CONNECTION_ERROR_WARNING_THRESHOLD`. Il default e `3`, anche quando la
variabile non e presente.

Il valore indica il numero di fallimenti tollerati con `WARN`: con `5`, ad
esempio, `ERROR` inizia dal sesto fallimento. Deve essere un intero non negativo;
`0` produce `ERROR` dal primo fallimento. Un valore vuoto, non numerico,
negativo, frazionario o oltre il limite degli interi sicuri JavaScript causa
un errore esplicito, non un ripristino silenzioso del default.

Per cambiare la soglia usare il parametro dello stack nel normale percorso di
configurazione del componente e aggiornare lo stack/Lambda tramite la pipeline.
Non serve modificare o ricompilare il codice dopo questo rilascio, ma la
configurazione deve essere applicata. Il contatore persistito non viene
azzerato: la nuova soglia si applica al prossimo fallimento.
