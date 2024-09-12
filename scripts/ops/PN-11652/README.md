# PN-11652

Script per aggiornare i valori in pn-AuthJwtAttributes come richiesto da SRS 
https://pagopa.atlassian.net/wiki/spaces/PN/pages/898170899/SRS+AuthN+B2B+migliorie+runbook+e+monitoring#Work-Item-3.3---%5BOPERATION-use-dynamo-console%5D-Adeguamento-configurazioni-RADD

## Tabella dei Contenuti

- [Descrizione](#descrizione)
- [Installazione](#installazione)
- [Utilizzo](#utilizzo)

## Descrizione

Lo Script si divide in due step: 
- esegue l'uppercase di allowedApplicationRoles e applicationRole in contextAttributes di tutti gli elementi in pn-AuthJwtAttributes
- rimuove applicationRole in contextAttributes di tutti gli elementi in pn-AuthJwtAttributes
come delineato nell'SRS definito in Overview

## Installazione

```bash
npm install
```

## Utilizzo
### Step preliminare

```bash
aws sso login --profile sso_pn-core-<env>
```

### Esecuzione
```bash
node index.js --envName <env-name> --step <step> [--dryrun]

```
Dove:
- `<env-name>` l'environment sul quale si intende avviare lo script
- `<step>` step da eseguire
- `<dryrun>` opzionale serve per verificare cosa passiamo a dynamo prima dell'esecuzione