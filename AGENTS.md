# Devfes_SanpoLab

DevFest GDGoC Japan Hackathon 2026 提出プロダクト。散歩中に撮った写真から「今日の主役」を1つ抽選し、
「この◯◯、実は…」と既知の物の裏面を語るWebアプリ。カテゴリ：観光。
運用ルールの正は docs/team.md。矛盾したら team.md が優先。

## 絶対ルール
- 設計の知見は docs/ に書いてあるものだけ使う
- LLM は Vertex AI 経由の Gemini のみ。他社LLM・他社AIサービスは使わない
- APIキー・秘密情報をコミットしない。認証はサービスアカウント / ADC
- 技術・設計を選択したら docs/decisions.md に5行形式で追記（候補/選択/理由/捨てた理由/見直し条件）
- 作業ごとに docs/ai-usage.md に1行追記（場面/頼んだこと/候補/採用/不採用理由）
- 追加したライブラリ・素材は docs/assets.md に出典とライセンスを追記

## AIとの付き合い方（Own the Why）
- 技術・設計・ライブラリ・プロンプト構造の選択が絡む依頼では、候補を2〜3個 pros/cons 付きで提示し、ユーザーの選択を待つ。勝手に決めて実装しない
- API仕様・モデル名・料金・リージョン対応を述べるときは公式ドキュメントのURLを添える。不確かなら「未確認」と明記
- 実装後は「このコードが何をしているか」を3行で説明する
- decisions.md の「理由」欄はユーザーが書く。求められても候補の提示にとどめる

## 構成
- backend/  Python 3.12 / FastAPI / Cloud Run。Vertex AI Gemini、Firestore、Cloud Storage
- frontend/ Next.js (App Router, output: 'export') / Firebase Hosting / PWA
- docs/     team.md decisions.md ai-usage.md assets.md api.md

## ディレクトリ規約
backend/: main.py（起動・CORS・ルーター登録のみ）config.py routers/ services/ prompts/ schemas.py tests/
frontend/: app/ components/ lib/（api.ts は /openapi.json から生成した型を使う、env.ts）

## API契約（変更時は backend/schemas.py を先に直す）
- POST /api/analyze   multipart(file) → {session_id, scene, objects[], texts[], lineup[]}
- GET  /api/narrate   ?session_id&pick_id → SSE (event: meta|delta|done|error)
- POST /api/feedback  {session_id, pick_id, rating: boring|fishy|great, comment}

## コーディング規約
- ruff / prettier / tsc / pre-commit に従う。手で整えない
- 型ヒント必須。外部I/Oは services/ に隔離、ルーターは薄く
- Gemini の出力は Pydantic でパース。失敗時は 502 に理由を付ける
- 環境変数は config.py / env.ts に集約
- 例外を握りつぶさない。ログは構造化（JSON）
- 関数は1画面に収まる長さ。コメントは「なぜ」だけ
- テストは schemas のパースと抽選ロジックの2本のみ

## 語りの設計ルール（プロンプトに反映。文面は新規に書く）
1. 看板禁止：OCRで読めた文字は言わない。その一歩先だけ語る
2. 断定禁止：固有の由来・歴史は仮説の形。Search grounding で裏取りし出典を付ける
3. 仮説は1つ、ぼかし表現は2回まで
4. 写真で見えない細部は語らず「現地で見て」の宿題にする
5. 推理ゲーム調・実況調は禁止
6. 毎回「次の散歩で転用できる観察パターン」を1つ渡す
7. 抽選台帳は sure && fixture && whole && salience>=3 のみ。人物・影・一時物は除外
8. 場所情報は列挙には渡さず、語りにだけ渡す

## コミット
- 形式: type(scope): 内容（日本語可）。type は feat/fix/docs/chore/refactor
- 秘密情報・他社AIツール名を含めない。Co-Authored-By 等のAI署名行は付けない
- main は常に動く。feature ブランチ → PR

## 日程
- ハッカソン規定：提出締切 11/10（火）19:00（コードフリーズ）。デプロイURLは 11/14 まで稼働
- チーム内：機能凍結 11/9（月）夜。以降はバグ修正・動画・ドキュメントのみ