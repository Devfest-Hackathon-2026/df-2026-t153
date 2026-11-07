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

## 初回セットアップ（Windows）

PowerShell で1回だけ実行する。

```powershell
winget install -e --id OpenJS.NodeJS.LTS      # Node.js 26（.nvmrc と同じ）
winget install -e --id Python.Python.3.12
winget install -e --id Google.CloudSDK
```

1. VSCode（とターミナル）を再起動して PATH を読み直す
2. venv の Activate.ps1 を実行できるようにする
   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
   ```
3. 設定 → アプリ → アプリの詳細設定 → アプリ実行エイリアス で `python.exe` と `python3.exe`（アプリ インストーラー）をオフにする。オンのままだと Microsoft Store が起動する
4. Firebase CLI と gcloud の初期設定
   ```powershell
   npm i -g firebase-tools
   gcloud init
   gcloud auth application-default login   # ADC。キーファイルは使わない
   gcloud config set project sanpolab
   ```

Mac：`brew install node@26 python@3.12 && brew install --cask gcloud-cli`（以降の 4. は同じ）

## ローカル起動

前提：Python 3.12、Node.js 26（`.nvmrc`）、gcloud CLI

### backend

```sh
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
# 環境変数は .env.example を参照して設定する（*_DISABLED=1 ならクラウドに書かない）
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
