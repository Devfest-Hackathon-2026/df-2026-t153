#!/usr/bin/env bash
# backend/ を Cloud Run にデプロイする。Dockerfile を Cloud Build でビルドする（--source）。
# 使い方: scripts/deploy-backend.sh   （SERVICE_ACCOUNT・ALLOWED_ORIGINS・MIN_INSTANCES・MAX_INSTANCES は環境変数で上書きできる）
# 公開（誰でも呼べる）設定は owner 権限が要るので、初回に1度だけ owner が行う:
#   gcloud run services update sanpolab-api --region asia-northeast1 --no-invoker-iam-check
set -euo pipefail

PROJECT=sanpolab
REGION=asia-northeast1 # same region as Firestore and the photo bucket
SERVICE=sanpolab-api
SA="${SERVICE_ACCOUNT:-sanpolab-api@${PROJECT}.iam.gserviceaccount.com}"
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-https://sanpolab.web.app,https://sanpolab.firebaseapp.com,http://localhost:3000}"
MIN_INSTANCES="${MIN_INSTANCES:-0}"
# Caps Gemini spend if the public URL gets scripted: at most MAX_INSTANCES x 20 requests at once
MAX_INSTANCES="${MAX_INSTANCES:-5}"

cd "$(dirname "$0")/../backend"

# ^@^ switches the env-var separator so commas inside ALLOWED_ORIGINS survive
gcloud run deploy "$SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --source . \
  --service-account "$SA" \
  --memory 1Gi \
  --min-instances "$MIN_INSTANCES" \
  --max-instances "$MAX_INSTANCES" \
  --concurrency 20 \
  --set-env-vars "^@^GOOGLE_CLOUD_PROJECT=${PROJECT}@GOOGLE_CLOUD_LOCATION=global@GEMINI_FLASH_MODEL=gemini-3.8-flash@PHOTO_BUCKET=sanpolab-photos@ALLOWED_ORIGINS=${ALLOWED_ORIGINS}"

gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format 'value(status.url)'
