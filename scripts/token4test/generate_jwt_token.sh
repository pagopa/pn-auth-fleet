#!/usr/bin/env bash
    
set -Eeuo pipefail
trap cleanup SIGINT SIGTERM ERR EXIT

cleanup() {
  trap - SIGINT SIGTERM ERR EXIT
  # script cleanup here
}

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd -P)


usage() {
      cat <<EOF
    Usage: $(basename "${BASH_SOURCE[0]}") [-h] [-v] [-p <aws-profile>] -r <aws-region> -e <env-type>  -u <user-id>
        
    [-h]                           : this help message
    [-v]                           : verbose mode
    [-p <aws-profile>]             : aws cli profile (optional)
    -r <aws-region>                : aws region as eu-south-1
    -e <env-type>                  : one of dev / uat / svil / coll / cert / prod
    -u <user-id>                   : the id returned by SPID-HUB
EOF
  exit 1
}
parse_params() {
  # default values of variables set from params
  aws_profile=""
  aws_region=""
  env_type=""
  keyIdAlias="alias/pn-jwt-sign-key"
  uid=""
  
  while :; do
    case "${1-}" in
    -h | --help) usage ;;
    -v | --verbose) set -x ;;
    -p | --profile) 
      aws_profile="${2-}"
      shift
      ;;
    -r | --region) 
      aws_region="${2-}"
      shift
      ;;
    -e | --env-name) 
      env_type="${2-}"
      shift
      ;;
    -u | --uid) 
      uid="${2-}"
      shift
      ;;
    -?*) die "Unknown option: $1" ;;
    *) break ;;
    esac
    shift
  done

  args=("$@")

  # check required params and arguments
  [[ -z "${env_type-}" ]] && usage 
  [[ -z "${aws_region-}" ]] && usage
  [[ -z "${uid-}" ]] && usage
  return 0
}

dump_params(){
  echo ""
  echo "######      PARAMETERS      ######"
  echo "##################################"
  echo "Env Name:           ${env_type}"
  echo "AWS region:         ${aws_region}"
  echo "AWS profile:        ${aws_profile}"
  echo "User Id:            ${uid}"
  echo "Key Alias:          ${keyIdAlias}"
}


# START SCRIPT

parse_params "$@"
dump_params


iss="https://webapi.${env_type}.pn.pagopa.it"
aud="webapi.${env_type}.pn.pagopa.it"


echo ""
echo "=== Base AWS command parameters"
aws_command_base_args=""
if ( [ ! -z "${aws_profile}" ] ) then
  aws_command_base_args="${aws_command_base_args} --profile $aws_profile"
fi
if ( [ ! -z "${aws_region}" ] ) then
  aws_command_base_args="${aws_command_base_args} --region  $aws_region"
fi
echo ${aws_command_base_args}


base64_encode()
{
	declare input=$(</dev/stdin)
	# Use `tr` to URL encode the output from base64.
	printf '%s' "${input}" | base64 | tr '/+' '_-' | tr -d '='
}

keyId=$( aws ${aws_command_base_args} \
    kms describe-key \
      --key-id ${keyIdAlias} \
      | jq -r '.KeyMetadata.KeyId' )

echo ""
echo "KeyId: ${keyId}"

date_now=$(date +%s)
next_year_date=$(date -v +1y +%s)
echo "Date now epoch: ${date_now}"
echo "Next year date epoch: ${next_year_date}"


header="{\"alg\": \"RS256\",\"typ\": \"JWT\",\"kid\": \"${keyId}\"}"
dot="."
payload="{\"iat\": ${date_now},\"exp\": ${next_year_date}, \"uid\": \"${uid}\",\"iss\": \"${iss}\",\"aud\": \"${aud}\"}"

header_base64=$(echo "${header}" | base64_encode)
payload_base64=$(echo "${payload}" | base64_encode)

message_to_sign=${header_base64}${dot}${payload_base64}

signature=$( aws ${aws_command_base_args} \
    kms sign \
      --key-id ${keyId} \
      --message ${message_to_sign} \
      --message-type RAW \
      --signing-algorithm RSASSA_PKCS1_V1_5_SHA_256 \
      --cli-binary-format raw-in-base64-out \
      | jq -r '.Signature' | tr '/+' '_-' | tr -d '=' )

token="${message_to_sign}${dot}${signature}"

echo ""
echo ""
echo "=================== Token ================"
echo ${token}
