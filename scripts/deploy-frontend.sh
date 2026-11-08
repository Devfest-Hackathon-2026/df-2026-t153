#!/usr/bin/env sh
# Build the static frontend against the given API and publish it to Firebase Hosting.
# Usage: sh scripts/deploy-frontend.sh https://<cloud-run-service>.run.app
set -eu

API_BASE="${1:?usage: $0 <NEXT_PUBLIC_API_BASE>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT/frontend"
# Explicit env wins over .env.local; the mock flag is cleared so it never ships
NEXT_PUBLIC_API_BASE="$API_BASE" NEXT_PUBLIC_MOCK_NARRATE= npm run build

cd "$ROOT"
firebase deploy --only hosting --project sanpolab
