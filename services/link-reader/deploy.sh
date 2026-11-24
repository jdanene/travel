#!/bin/sh
# Deploys the link reader to AWS Lambda (profile zen, region us-east-2) behind
# a public function URL, and prints that URL. scripts/ship.sh --with-reader
# runs it; it also runs alone.
#
# Usage: sh services/link-reader/deploy.sh
#
# Every step replaces what is there, so a second run is safe. The first step
# that fails stops the script with the step's name. No step retries. An
# expired AWS sign-in stops it before anything changes, with the command to
# sign in again.
set -u

cd "$(dirname "$0")" || exit 1

PROFILE=zen
REGION=us-east-2
NAME=travel-link-reader
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

zip_file=$(mktemp -d)/link-reader.zip
step "package the code" zip -q -j "$zip_file" handler.mjs parse.mjs sites.mjs

# The role lets the function write its own logs and nothing else.
if ! aws_ iam get-role --role-name "$NAME" >/dev/null 2>&1; then
  step "create the role" aws_ iam create-role --role-name "$NAME" --assume-role-policy-document \
    '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
  step "let the role write logs" aws_ iam attach-role-policy --role-name "$NAME" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  # A new role takes a few seconds to reach Lambda.
  step "wait for the role" sleep 10
fi
role="arn:aws:iam::$account:role/$NAME"

if aws_ lambda get-function --function-name "$NAME" >/dev/null 2>&1; then
  step "replace the code" aws_ lambda update-function-code --function-name "$NAME" --zip-file "fileb://$zip_file"
  step "wait for the code" aws_ lambda wait function-updated-v2 --function-name "$NAME"
  step "replace the settings" aws_ lambda update-function-configuration --function-name "$NAME" \
    --runtime nodejs22.x --handler handler.handler --timeout 10 --memory-size 256 --role "$role"
  step "wait for the settings" aws_ lambda wait function-updated-v2 --function-name "$NAME"
else
  step "create the function" aws_ lambda create-function --function-name "$NAME" --zip-file "fileb://$zip_file" \
    --runtime nodejs22.x --handler handler.handler --timeout 10 --memory-size 256 --architectures arm64 --role "$role"
  step "wait for the function" aws_ lambda wait function-active-v2 --function-name "$NAME"
fi

# Two at a time caps the cost of a burst of calls.
step "cap concurrency at 2" aws_ lambda put-function-concurrency --function-name "$NAME" --reserved-concurrent-executions 2

# CORS is the handler's job, so the URL carries no CORS setting.
if ! aws_ lambda get-function-url-config --function-name "$NAME" >/dev/null 2>&1; then
  step "create the function URL" aws_ lambda create-function-url-config --function-name "$NAME" --auth-type NONE
fi

# Anyone may call the URL; the permissions say so. Re-adding one that exists is not an error.
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
echo "  link reader: $url"
