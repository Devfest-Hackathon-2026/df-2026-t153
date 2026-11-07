# AI Usage Log

AIを使った作業ごとに1行追記する。

| 日付 | 場面 | 頼んだこと | 候補 | 採用 | 不採用理由 |
|---|---|---|---|---|---|
| 2026-11-06 | リポジトリ骨組み | 指定した構成（FastAPI /healthz、Dockerfile、ruff/mypy、Next.js export 設定、Prettier、pre-commit、CI、docs 雛形）でファイルを作らせた | create-next-app で生成 / テンプレート相当を手書き | 手書きで作成（構成は人が指定） | 作業環境に Node.js が無く create-next-app を実行できなかった |
| 2026-11-06 | POST /api/analyze 実装 | 画像前処理・Gemini 列挙・lineup 抽選・Firestore/GCS 保存・テストを書かせ、モデルとリージョンの候補を出させた | モデル: gemini-3.8-flash / 3.7-flash / 3.5-flash、リージョン: global / us | gemini-3.8-flash + global（人が選択、D-01） | 3.7: 2027-01 退役予定、3.5: 東京は PayGo 不可で世代が古い、us: SDK での指定可否が未確認 |
| 2026-11-06 | 列挙の速度と漏れ対策 | 速度候補の実測（sample.jpg 各3回）、列挙プロンプトの修正（最低12個・設備インフラ確認・文字は texts へ）、sample.jpg の EXIF 除去、D-01〜03 の下書き | thinking LOW / 最大辺 1024 / 両方 | 未選択（人が選ぶ） | — |
| 2026-11-06 | thinking LOW 反映・texts 補完・再試行 | LOW の反映と再実測、detail からの texts 補完とテスト、429/503 再試行、D-04/D-05 の下書きを書かせた | 補完: サーバ側正規表現 / schema に text 追加 / 別呼び出し、再試行: アプリ側 / SDK retry_options / なし | サーバ側正規表現、アプリ側再試行（人が指定） | schema 変更は契約変更が要る、SDK 任せは再試行回数をログに出せない |
| 2026-11-07 | 開発環境の統一 | README に Windows 初回セットアップ節、requirements の == 固定、.nvmrc（26）と CI の Node 26 化、backend/.env.example を作らせた | — | 指示どおり（人が指定） | — |
