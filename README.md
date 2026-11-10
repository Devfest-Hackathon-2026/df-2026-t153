# SanpoLab

散歩中に撮った写真から「今日の主役」を1つ抽選し、「この◯◯、実は…」と身近な物の裏面を語る Web アプリ。

- デプロイ URL：https://sanpolab.web.app（frontend）／ backend は「デプロイ」の表を参照
- DevFest GDGoC Japan Hackathon 2026 / カテゴリ：観光

## デプロイ

| 役割 | 先 | URL |
|---|---|---|
| frontend | Firebase Hosting（プロジェクト `sanpolab`） | https://sanpolab.web.app |
| backend | Cloud Run `sanpolab-api`（asia-northeast1） | https://sanpolab-api-987498575224.asia-northeast1.run.app |

### frontend（静的エクスポート → Firebase Hosting）

```sh
# リポジトリルートで。引数は backend（Cloud Run）の URL。末尾スラッシュなし
sh scripts/deploy-frontend.sh https://sanpolab-api-987498575224.asia-northeast1.run.app
```

- `NEXT_PUBLIC_API_BASE` はビルド時に埋め込まれるので、**backend の URL が変わったら必ずビルドし直す**。差し替える箇所は上の表と、このコマンドの引数の 2 か所
- `firebase deploy` の認証は `gcloud auth application-default login` の ADC を使う（`firebase login` でもよい）
- 設定は `firebase.json`（公開ディレクトリ `frontend/out`、cleanUrls、キャッシュヘッダ。SPA rewrite は無し）と `.firebaserc`

### backend 側で必要な設定（Cloud Run）

- `ALLOWED_ORIGINS` に Hosting のオリジンを入れる：`https://sanpolab.web.app,https://sanpolab.firebaseapp.com`（ローカル開発を残すなら `http://localhost:3000` も）
- 未認証で呼べるようにする（`roles/run.invoker` を `allUsers` に）。これが無いとブラウザからは 403 になる
- `scripts/deploy-backend.sh` は `ALLOWED_ORIGINS` の既定に上の3つを入れ、台数の上限 5・同時 20 件でデプロイする

## データの保持

- 写真（Cloud Storage `sessions/{id}.jpg`、EXIF なし）、解析結果（Firestore `sessions`）、評価（Firestore `feedback`）は **7 日で自動削除**する
  - Firestore：各ドキュメントの `expire_at`（保存時刻 + 7 日）に TTL ポリシーを設定
  - Cloud Storage：バケットのライフサイクルルール（作成から 7 日で削除）
- 写真の位置情報（EXIF GPS）は保存しない。町名を引くのに使ったら捨てる。レスポンスにも語りのプロンプトにも含めない（D-41）
- 町名の表示（📍）のため、丸める前の座標を国土地理院の逆ジオコーダに送る。保存するのは丁目を落とした町名だけ
- アカウント機能は無く、利用者を特定する情報は保存しない

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
# http://localhost:8080/health
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
