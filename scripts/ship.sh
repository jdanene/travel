#!/bin/sh
# Builds the trip app, then deploys the database rules and the site to
# Firebase (travel-ca8f9). Rules go first, so a new page never meets old rules.
#
# Usage: sh scripts/ship.sh [--with-reader]
#   --with-reader  also deploys the link reader (services/link-reader/deploy.sh)
#                  and prints its function URL. An expired AWS sign-in stops
#                  it with the command to sign in again; the site is live by then.
#
# Each step prints its name before it runs. The first step that fails stops
# the script with the step's name and exit code. No step retries, and every
# step replaces what is live, so a second run is safe.
set -u

cd "$(dirname "$0")/.." || exit 1

with_reader=no
for arg in "$@"; do
  case "$arg" in
    --with-reader) with_reader=yes ;;
    *) echo "ship.sh: unknown option $arg" >&2; exit 2 ;;
  esac
done

step() {
  name=$1; shift
  echo "==> $name"
  "$@"
  code=$?
  if [ "$code" -ne 0 ]; then
    echo "ship.sh: step \"$name\" failed with exit code $code" >&2
    exit "$code"
  fi
}

step "install the app's packages" npm --prefix web ci
step "build the app into public/app" npm --prefix web run build
step "deploy database rules" firebase deploy --only database --project travel-ca8f9
step "deploy hosting" firebase deploy --only hosting --project travel-ca8f9

if [ "$with_reader" = yes ]; then
  step "deploy the link reader" sh services/link-reader/deploy.sh
fi
echo "ship.sh: done"
