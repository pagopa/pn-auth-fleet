# GENERAZIONE TOKEN TEST

Prima di generare i token eseguire il comando
```
aws sso login --profile <nome-profilo>
```

Per eseguire lo script di generazione
```
source scripts/token4test/<nome-script> -p <nome-profilo> -r <regione-aws> -e <ambiente> -u <user-id>
```

Per lo script _generate_jwt_token_PG.sh_ personalizzare i campi _organization_id_, _role_ e _tax_id_ in base al token da generare.