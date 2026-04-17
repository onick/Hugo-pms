#!/usr/bin/env bash
# Deploy the Silex landing to Cloudflare Workers (hugo-pms).
#
# Requirements:
#   - Hugo installed (`brew install hugo`)
#   - wrangler available (comes via npx)
#   - ~/.cloudflare/silex.env with CLOUDFLARE_API_TOKEN + ACCOUNT_ID
#
# Usage:
#   bash scripts/deploy.sh

set -euo pipefail

# Load credentials — refuse to run if the env file is missing or world-readable
ENV_FILE="$HOME/.cloudflare/silex.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ Missing $ENV_FILE" >&2
  exit 1
fi
if [[ "$(stat -f '%OLp' "$ENV_FILE" 2>/dev/null || stat -c '%a' "$ENV_FILE")" != "600" ]]; then
  echo "❌ $ENV_FILE has insecure permissions — run: chmod 600 $ENV_FILE" >&2
  exit 1
fi
# shellcheck disable=SC1090
source "$ENV_FILE"

cd "$(dirname "$0")/.."

echo "▶ Building Hugo site..."
hugo --minify

echo "▶ Deploying to Cloudflare (hugo-pms worker)..."
npx --yes wrangler@latest deploy

echo "▶ Verifying production..."
sleep 3
status=$(curl -s -o /dev/null -w "%{http_code}" "https://www.silexpms.com/?bust=$(date +%s)")
if [[ "$status" == "200" ]]; then
  echo "✅ Live at https://www.silexpms.com (HTTP $status)"
else
  echo "⚠️  Production returned HTTP $status — check CF dashboard" >&2
  exit 1
fi
