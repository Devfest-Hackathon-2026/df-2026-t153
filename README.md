# SanpoLab

散歩中に撮った写真から「今日の主役」を1つ抽選し、「この◯◯、実は…」と身近な物の裏面を語る Web アプリ。

- デプロイ URL：
- DevFest GDGoC Japan Hackathon 2026 / カテゴリ：観光

## 構成

| ディレクトリ | 内容 |
|---|---|
| `backend/` | Python 3.12 / FastAPI / Cloud Run（Vertex AI Gemini, Firestore, Cloud Storage） |
| `frontend/` | Next.js（App Router, static export）/ Firebase Hosting |
| `docs/` | 運用ルール・意思決定・API 契約 |

## ローカル起動

前提：Python 3.12、Node.js 22、gcloud CLI

### backend

```sh
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
gcloud auth application-default login   # ADC。キーファイルは使わない
uvicorn main:app --reload --port 8080
# http://localhost:8080/healthz
```

### frontend

```sh
cd frontend
npm install
npm run dev
# http://localhost:3000
```

### チェック

```sh
pip install pre-commit && pre-commit install   # リポジトリルートで1回

cd backend  && ruff check . && ruff format --check . && mypy .
cd frontend && npm run lint && npm run typecheck && npm run build
```
