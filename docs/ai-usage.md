# AI Usage Log

AIを使った作業ごとに1行追記する。

| 日付 | 場面 | 頼んだこと | 候補 | 採用 | 不採用理由 |
|---|---|---|---|---|---|
| 2026-11-06 | リポジトリ骨組み | 指定した構成（FastAPI /healthz、Dockerfile、ruff/mypy、Next.js export 設定、Prettier、pre-commit、CI、docs 雛形）でファイルを作らせた | create-next-app で生成 / テンプレート相当を手書き | 手書きで作成（構成は人が指定） | 作業環境に Node.js が無く create-next-app を実行できなかった |
| 2026-11-06 | POST /api/analyze 実装 | 画像前処理・Gemini 列挙・lineup 抽選・Firestore/GCS 保存・テストを書かせ、モデルとリージョンの候補を出させた | モデル: gemini-3.8-flash / 3.7-flash / 3.5-flash、リージョン: global / us | gemini-3.8-flash + global（人が選択、D-01） | 3.7: 2027-01 退役予定、3.5: 東京は PayGo 不可で世代が古い、us: SDK での指定可否が未確認 |
| 2026-11-06 | 列挙の速度と漏れ対策 | 速度候補の実測（sample.jpg 各3回）、列挙プロンプトの修正（最低12個・設備インフラ確認・文字は texts へ）、sample.jpg の EXIF 除去、D-01〜03 の下書き | thinking LOW / 最大辺 1024 / 両方 | 未選択（人が選ぶ） | — |
| 2026-11-06 | thinking LOW 反映・texts 補完・再試行 | LOW の反映と再実測、detail からの texts 補完とテスト、429/503 再試行、D-04/D-05 の下書きを書かせた | 補完: サーバ側正規表現 / schema に text 追加 / 別呼び出し、再試行: アプリ側 / SDK retry_options / なし | サーバ側正規表現、アプリ側再試行（人が指定） | schema 変更は契約変更が要る、SDK 任せは再試行回数をログに出せない |
| 2026-11-07 | 開発環境の統一 | README に Windows 初回セットアップ節、requirements の == 固定、.nvmrc（26）と CI の Node 26 化、backend/.env.example を作らせた | — | 指示どおり（人が指定） | — |
| 2026-11-07 | F1 写真送信→box 表示 | page.tsx と PhotoInput / BoxOverlay / Lineup、env.ts、OpenAPI 型生成と api.ts を書かせ、型生成ツールの候補を出させた | openapi-typescript / + openapi-fetch / orval | openapi-typescript（人が選択、D-06） | openapi-fetch: 依存増で multipart・SSE は結局手書き、orval: API 3本には過剰 |
| 2026-11-07 | 環境構築・GET /api/narrate 実装 | ローカル環境構築（Python 3.12 / Node 22 / ADC）の手順と実行、narrate の SSE・Search grounding・語りプロンプト・写真の読み戻しを書かせ、sample.jpg の鬼瓦で実測、D-07〜09 の下書き | SSE: FastAPI 標準 / sse-starlette / 手書き、視点: 区切り行 / 2回呼び出し / JSON 一括、画像: 全体+box / 切り抜き / 両方 | FastAPI 標準、区切り行、全体+box（人が選択） | 依存追加・呼び出し増・文脈欠落を避けた |
| 2026-11-07 | narrate のプロンプト比較・通信切断の扱い | 10枚のテスト画像で v1/v2 プロンプトを比較させ、比較中に見つかった通信切断（httpx2.ReadError）が 500 / 無言切断になる穴を直させた | 捕捉: httpx2 を明示 / Exception を広く | httpx2 を明示（人が選択、D-10） | 広く捕まえると通信以外の失敗も 503 に見える |
| 2026-11-07 | 抽選候補0件時の選び直し | 候補0件の原因調査（同じ写真で analyze 5回）、0件時に whole だけ緩める実装とテスト、10枚×3回での効果検証、D-11 の下書きを書かせた | whole を外す / whole と salience を外す / 段階的に緩める / 緩めない | whole を外す（人が選択、D-11） | 両方外すと小さな脇役が主役になる、段階的は実装が増える、緩めないと体験が止まる |
| 2026-11-07 | 語りプロンプト v2 の採用 | v1/v2 の比較結果をもとに、比較で使った v2 の文言を narration.py に反映させ、D-12 の下書きを書かせた | v1 / v2 / v2+言い切り防止の一文 | v2（人が選択、D-12） | v1 は出典付きが少ない、一文追加は未検証 |
| 2026-11-07 | POST /api/feedback 実装 | 設計の選択肢（レスポンス・保存先・再送・検証・comment・一緒に保存する物）を出させ、選んだ形で schemas・router・service・テスト・api.md・D-13 の下書きを書かせた | 各項目 2〜5 案 | 204・トップレベル・上書き・lineup 確認・主役を写す（人が選択、D-13） | 返り値の使い道が無い、集計しにくい、連打で票が増える、narrate の変更が要る |
| 2026-11-07 | F2 語り表示 | EventSource で narrate を購読し HeroCrop / Narration / Sources / Takeaway を描く画面、引き直し、error の再試行、NEXT_PUBLIC_MOCK_NARRATE のモック、390px のヘッドレスでスクリーンショット4枚を書かせた | 購読: EventSource / fetch+ReadableStream、crop: SVG viewBox / canvas | EventSource（人が指定）、crop は SVG viewBox（BoxOverlay と同じ仕組み） | fetch 版は手書きの SSE パーサが要る、canvas は再描画管理が要る |
| 2026-11-07 | 語り中心のレイアウト調整 | 語り開始後の並び替え、候補チップ、box ラベルの削減、出典なしの文言、配色トークンを書かせた。レイアウト方式の候補を出させた。絵文字フィードバック UI は一度作ったが「旧プロジェクトの調整用で今回は不要」と判断して外した | state で並び替え / /story ルートへ遷移 | state で並び替え（人が選択、D-14）。チップは lineup のみ（人が選択） | ルート遷移は写真の持ち回りとリロード耐性に難 |
| 2026-11-08 | 待機中の UI と動き（F4） | 待たせない UI の調査（Maister / Norton & Buell / Nielsen / Viget）をもとに候補を出させ、選んだ形で 3 段階メッセージ・走査線と格子の装飾・枠のロックオン・観察ヒント 10 本・@starting-style の入場・reduced-motion・Noto Sans JP を実装させ、390px で連続スクリーンショットと reduced-motion の確認、D-16〜18 の下書きを書かせた。ヒントは「見れば分かる観察」→「雑学」に書き直させ、10 本それぞれの出典を Web で確認させて hints.ts にコメントで残した | 遷移: ViewTransition / @starting-style / motion、待機: 秒カウンタ / 擬似進捗 / 3 段階、フォント: システム / Noto Sans JP / 他 | @starting-style・3 段階・Noto Sans JP（人が選択、D-16〜18）。待機中の「別の写真」は無効のまま（人が選択） | experimental フラグは凍結前日に入れない、85% で止まるバーは正直でない、依存を増やす理由がない |
