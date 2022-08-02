PROFILE=coll
REGION=eu-south-1
aws logs delete-log-group --log-group-name /aws/lambda/pn-apikeyAuthorizerLambda --profile $PROFILE --region $REGION
aws logs delete-log-group --log-group-name /aws/lambda/pn-tokenExchangeLambda --profile $PROFILE --region $REGION
aws logs delete-log-group --log-group-name /aws/lambda/pn-ioAuthorizerLambda --profile $PROFILE --region $REGION
aws logs delete-log-group --log-group-name /aws/lambda/pn-jwtAuthorizerLambda --profile $PROFILE --region $REGION