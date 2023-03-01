## Creazione file .env
Creare il file _.env_ nella root del progetto settando le seguenti variabili d'ambiente:
- KEY_ID
- CACHE_TTL
- TOKEN_TTL
- ISSUER
- ALLOWED_ISSUER
- ALLOWED_ORIGIN
- ALLOWED_TAXIDS_PARAMETER

Esempio file .env:
```
    CACHE_TTL=3600
    TOKEN_TTL=7200
    ALLOWED_TAXIDS_PARAMETER=fake-path/fake-param
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

## Esecuzione codecoverage
Il comando di seguito permette di eseguire la code coverga dopo l'esecuizione dei test

```
    npm run-script coverage
```

## Esecuzione test, coverage, sonar e build
Il comando di seguito permette di eseguire la routine dei test per poi generare lo zip di build

```
    npm run-script test-build
```


## Handler
L'handler della lambda è presente nel file index.js

## White list tax id
La variabile di ambiente **ALLOWED_TAXIDS_PARAMETER** deve essere valorizzata con il nome del parametro (nel ParameterStore) che contiene la white list dei codici fiscali.\

Il valore del parametro dentro al ParameterStore può assumere a sua volta tre valori:
- \* per indicare che tutti i codici fiscali sono validi
- lista di codici fiscali separati da virgola per indicare quali sono validi
- \* + lista di codici fiscali ognuno preceduto da ! e separati da virgola, per indicare quali codici fiscali sono esclusi

````bash
PROFILE=
REGION=
VALUE="*"
aws ssm put-parameter \
    --profile $PROFILE \
    --region $REGION \
    --description "TokenExchange login allowed tax ids" \
    --name "/pn-auth-fleet/allowedLoginTaxids" \
    --value $VALUE \
    --type "String" \
    --overwrite
````

