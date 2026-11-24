#!/bin/sh
# Builds the trip app, deploys the database rules, creates or updates the
# trip, seeds the parties, stamps the organizer's invite title into the link
# preview, then deploys the site to Firebase (travel-ca8f9).
# Rules go first, so a new page never meets old rules; the trip exists
# before the seed writes into it. At the end it prints the two links.
#
# Before anything, it checks that web/.env.production.local holds
# VITE_FIREBASE_API_KEY and VITE_FIREBASE_APP_ID, which the build needs.
# With no local/trip.json, it copies data/trip.example.json there and says so.
#
# Usage: sh scripts/ship.sh [--with-reader] [--with-texts]
#   --with-reader  also deploys the link reader (services/link-reader/deploy.sh)
#                  and prints its function URL. An expired AWS sign-in stops
#                  it with the command to sign in again; the site is live by then.
#   --with-texts   also deploys the trip texts sender (services/travel-texts/deploy.sh,
#                  AWS profile mappack) and prints its function URL, which
#                  web/.env.production holds as VITE_TEXTS_URL. Same rule on sign-in.
#
# Each step prints its name before it runs. The first step that fails stops
# the script with the step's name and exit code. No step retries, and every
# step replaces what is live, so a second run is safe.
set -u

cd "$(dirname "$0")/.." || exit 1

with_reader=no
with_texts=no
for arg in "$@"; do
  case "$arg" in
    --with-reader) with_reader=yes ;;
    --with-texts) with_texts=yes ;;
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

env_file=web/.env.production.local
for key in VITE_FIREBASE_API_KEY VITE_FIREBASE_APP_ID; do
  if ! grep -q "^$key=." "$env_file" 2>/dev/null; then
    echo "ship.sh: $env_file must hold $key=<value> (Firebase console, project settings, web app). Nothing was deployed." >&2
    exit 1
  fi
done

if [ ! -f local/trip.json ]; then
  mkdir -p local && cp data/trip.example.json local/trip.json
  echo "ship.sh: local/trip.json was missing; copied data/trip.example.json there. Edit it and run again to change the trip."
fi

step "install the app's packages" npm --prefix web ci
step "build the app into public/app" npm --prefix web run build
step "deploy database rules" firebase deploy --only database --project travel-ca8f9
step "create or update the trip" node scripts/create-trip.mjs
step "seed this year's and last year's parties" node scripts/seed-parties.mjs
step "stamp the invite title into the link preview" node scripts/stamp-preview.mjs
step "deploy hosting" firebase deploy --only hosting --project travel-ca8f9

if [ "$with_reader" = yes ]; then
  step "deploy the link reader" sh services/link-reader/deploy.sh
fi
if [ "$with_texts" = yes ]; then
  step "deploy the trip texts sender" sh services/travel-texts/deploy.sh
fi
echo "ship.sh: done. The links:"
cat local/links.txt
