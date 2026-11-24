#!/bin/sh
# Deploys the trip texts sender to AWS Lambda (profile mappack, region
# us-west-2) behind a public function URL, and prints that URL.
# scripts/ship.sh --with-texts runs it; it also runs alone.
#
# Usage: sh services/travel-texts/deploy.sh
#
# It sends from the registered number MapPack already uses, which another
# account shares with MapPack's. It finds that number read-only (the one
# toll-free number shared with the account) unless TEXTS_ORIGINATION_ARN
# names it. It never creates, changes or releases a number or a
# registration, and touches nothing of MapPack's: it creates or replaces
# only the function travel-texts and its role travel-texts.
#
# Every step replaces what is there, so a second run is safe. The first step
# that fails stops the script with the step's name. No step retries. An
# expired AWS sign-in stops it before anything changes, with the command to
# sign in again.
set -u

cd "$(dirname "$0")" || exit 1

PROFILE=mappack
REGION=us-west-2
NAME=travel-texts
export AWS_PAGER=""

aws_() { aws --profile "$PROFILE" --region "$REGION" "$@"; }

step() {
  label=$1; shift
  echo "  -> $label"
  "$@" >/dev/null
  code=$?
  if [ "$code" -ne 0 ]; then
    echo "deploy.sh: step \"$label\" failed with exit code $code" >&2
    exit "$code"
  fi
}

if ! account=$(aws_ sts get-caller-identity --query Account --output text 2>/dev/null); then
  echo "deploy.sh: the AWS sign-in has expired. Sign in, then run this again:" >&2
  echo "  aws sso login --profile $PROFILE --use-device-code" >&2
  exit 1
fi

# The number: read-only lookup of the toll-free number shared with this account.
number=${TEXTS_ORIGINATION_ARN:-}
if [ -z "$number" ]; then
  number=$(aws_ pinpoint-sms-voice-v2 describe-phone-numbers --owner SHARED \
    --query "PhoneNumbers[?NumberType=='TOLL_FREE' && Status=='ACTIVE'].PhoneNumberArn" --output text) || exit 1
fi
case "$number" in
  arn:aws:sms-voice:"$REGION":*:phone-number/phone-*) ;;
  *) echo "deploy.sh: found no single active toll-free number shared with this account. Set TEXTS_ORIGINATION_ARN to its full ARN." >&2; exit 1 ;;
esac

zip_file=$(mktemp -d)/travel-texts.zip
step "package the code" zip -q -j "$zip_file" handler.mjs blast.mjs token.mjs

# The role may write the function's own logs and send texts from that one number, nothing else.
trust='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
logs="arn:aws:logs:$REGION:$account:log-group:/aws/lambda/$NAME"
policy=$(cat <<EOF
{"Version":"2012-10-17","Statement":[
 {"Effect":"Allow","Action":"logs:CreateLogGroup","Resource":"$logs"},
 {"Effect":"Allow","Action":["logs:CreateLogStream","logs:PutLogEvents"],"Resource":"$logs:*"},
 {"Effect":"Allow","Action":"sms-voice:SendTextMessage","Resource":"$number"}
]}
EOF
)
if ! aws_ iam get-role --role-name "$NAME" >/dev/null 2>&1; then
  step "create the role" aws_ iam create-role --role-name "$NAME" --assume-role-policy-document "$trust"
  new_role=yes
fi
step "scope the role to its logs and the one number" aws_ iam put-role-policy --role-name "$NAME" \
  --policy-name logs-and-one-number --policy-document "$policy"
# A new role takes a few seconds to reach Lambda.
if [ "${new_role:-no}" = yes ]; then step "wait for the role" sleep 10; fi
role="arn:aws:iam::$account:role/$NAME"

# 120 seconds covers 30 texts: the sender starts no new text after 90 s, and each has 8 s at most.
settings="--runtime nodejs22.x --handler handler.handler --timeout 120 --memory-size 256 --role $role"
envvars="Variables={SMS_ORIGINATION_ARN=$number}"
if aws_ lambda get-function --function-name "$NAME" >/dev/null 2>&1; then
  step "replace the code" aws_ lambda update-function-code --function-name "$NAME" --zip-file "fileb://$zip_file"
  step "wait for the code" aws_ lambda wait function-updated-v2 --function-name "$NAME"
  # shellcheck disable=SC2086
  step "replace the settings" aws_ lambda update-function-configuration --function-name "$NAME" $settings --environment "$envvars"
  step "wait for the settings" aws_ lambda wait function-updated-v2 --function-name "$NAME"
else
  # shellcheck disable=SC2086
  step "create the function" aws_ lambda create-function --function-name "$NAME" --zip-file "fileb://$zip_file" \
    $settings --architectures arm64 --environment "$envvars"
  step "wait for the function" aws_ lambda wait function-active-v2 --function-name "$NAME"
fi

# One at a time: two organizers cannot run sends side by side. An account
# too small to reserve concurrency keeps the default; the daily cap still holds.
if ! aws_ lambda put-function-concurrency --function-name "$NAME" --reserved-concurrent-executions 1 >/dev/null 2>&1; then
  echo "  (concurrency not reserved: the account's limit is too small; the daily cap of 5 still applies)"
fi

# CORS is the handler's job, so the URL carries no CORS setting.
if ! aws_ lambda get-function-url-config --function-name "$NAME" >/dev/null 2>&1; then
  step "create the function URL" aws_ lambda create-function-url-config --function-name "$NAME" --auth-type NONE
fi

# Anyone may call the URL; the handler checks the Firebase ID token. Re-adding one that exists is not an error.
allow() {
  out=$(aws_ lambda add-permission --function-name "$NAME" --principal "*" "$@" 2>&1) && return 0
  case "$out" in *ResourceConflictException*) return 0 ;; esac
  echo "$out" >&2
  return 1
}
step "allow public calls to the URL" allow --statement-id public-url --action lambda:InvokeFunctionUrl --function-url-auth-type NONE
step "allow the URL to invoke" allow --statement-id public-url-invoke --action lambda:InvokeFunction --invoked-via-function-url

url=$(aws_ lambda get-function-url-config --function-name "$NAME" --query FunctionUrl --output text) || exit 1
rm -f "$zip_file"
echo "  trip texts: $url"
