# Decisions

技術・設計を選択したらその場で1件追記する。「理由」欄は人が書く（AIは候補の提示まで）。

## 雛形

```
## D-XX タイトル（YYYY-MM-DD / 記入者）
- 候補：
- 選択：
- 理由：
- 捨てた理由：
- 見直し条件：
```

---

## D-00 開発体制（2026-11-05 / ）
- 候補：(a) レイヤー分担（A=backend・Gemini・プロンプト / B=frontend・UI・動画） (b) 機能ごとに各自がフルスタックで縦に担当
- 選択：(a) レイヤー分担。ただし PR は「1機能 = API + UI を縦に切って1PR」（docs/team.md §1, §4）
- 理由：
- 捨てた理由：
- 見直し条件：

## D-01 Vertex AI のリージョン（2026-11-06 / ）
- 候補：(a) `global` (b) `us`（マルチリージョン） (c) `asia-northeast1`（東京）
- 選択：(a) `global`（`GOOGLE_CLOUD_LOCATION=global`）
- 理由：
- 捨てた理由：(b) google-genai SDK で location に `us` を渡せるか未確認、Firestore/GCS（東京）と離れる (c) 3.x Flash 系は東京では Provisioned Throughput のみで Standard PayGo 不可（[3-5-flash](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-5-flash)、[locations](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/locations)）
- 見直し条件：

## D-02 列挙モデル（2026-11-06 / ）
- 候補：(a) `gemini-3.8-flash` (b) `gemini-3.7-flash` (c) `gemini-3.5-flash`
- 選択：(a) `gemini-3.8-flash`（`GEMINI_FLASH_MODEL`）
- 理由：
- 捨てた理由：(b) 2027-01-28 退役予定で、3.8 の公式ページが移行先として案内している（[3-7-flash](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-7-flash)） (c) 世代が古く、東京リージョンの利点も PayGo では使えない
- 見直し条件：

## D-03 列挙の速度設定（2026-11-06 / ）
- 候補：(a) thinking_level LOW (b) 画像最大辺 1024 (c) LOW + 1024 （基準：既定 MEDIUM / 1568）
- 選択：(a) thinking_level LOW / 最大辺 1568（`services/gemini.py` の `THINKING_LEVEL`）。sample.jpg 実測：平均 27.9s → 9.4s、objects 13〜14 で漏れ増なし
- 理由：
- 捨てた理由：(b) 入力トークンが 2320 のまま変わらず（Gemini 3 は media_resolution で画像トークンが決まる）速度改善が小さい、暖簾の「蔵」を「醸」と 3/3 回誤読、保存写真も縮む (c) 速度は (a) と同等で (b) の誤読を引き継ぐ
- 見直し条件：

## D-04 texts の補完をサーバ側で行う（2026-11-06 / ）
- 候補：(a) サーバ側で objects[].detail から「」/""で囲まれた文字列と「〜と書かれ／〜と読め」の前の語を抜き出して texts に足す (b) プロンプトの指示だけに頼る（現状） (c) objects に `text` フィールドを足して response_schema で強制する (d) 文字だけを抜き出す Gemini 呼び出しを別に1回足す
- 選択：(a)（`schemas.py` の `Inventory._complete_texts`、where は object の name、重複は除外）
- 理由：
- 捨てた理由：(b) 「文字を読めた物は texts にも入れる」を足しても、表札「みそ醤油蔵」が 12/12 回 texts から漏れた (c) API 契約と schema の変更が必要 (d) 呼び出し回数とレイテンシが増える
- 見直し条件：

## D-05 Gemini 呼び出しの再試行（2026-11-06 / ）
- 候補：(a) アプリ側で 429/503 のみ、1s→3s の指数バックオフで最大2回、超えたら 503 (b) SDK の `HttpOptions.retry_options`（tenacity）に任せる (c) 再試行しない（即 502）
- 選択：(a)（`services/gemini.py` の `RETRY_STATUS` / `RETRY_DELAYS`）
- 理由：
- 捨てた理由：(b) 再試行回数がアプリ側から見えず構造化ログに出せない。既定の対象コードは 408/429/500/502/503/504 と広い（SDK の既定は再試行なし） (c) ベンチ中に global でも 429 RESOURCE_EXHAUSTED が出た
- 見直し条件：

## D-06 frontend の API 型生成ツール（2026-11-07 / ）
- 候補：(a) openapi-typescript（型だけ生成、fetch は手書き） (b) openapi-typescript + openapi-fetch（型安全な fetch ラッパー） (c) orval（クライアント関数ごと生成。@hey-api/openapi-ts も同系統）
- 選択：(a) openapi-typescript 7.13.0。`npm run gen:api` で `frontend/lib/api.gen.ts` を生成してコミットし、`lib/api.ts` が型を参照する
- 理由：
- 捨てた理由：(b) 実行時の依存が1つ増え、multipart は bodySerializer で自前の FormData、SSE（narrate）には使えず結局一部は手書き (c) 設定と生成コードが大きく、API 3本には過剰

## D-07 SSE の実装方式（2026-11-07 / ）
- 候補：(a) FastAPI 標準の `fastapi.sse.EventSourceResponse`（0.162 に同梱） (b) sse-starlette (c) `StreamingResponse` で SSE を手書き
- 選択：(a)（`routers/narrate.py`。パスオペレーションで `ServerSentEvent` を yield）
- 理由：入っている FastAPI 0.162 に含まれていて、依存を増やさずに済む
- 捨てた理由：(b) 依存が増え assets.md の管理対象が増える (c) 整形や keepalive を自前で書く必要がある
- 見直し条件：

## D-08 「持ち帰る視点」の取り出し方（2026-11-07 / ）
- 候補：(a) 1回の呼び出しで本文の後に区切り行（`### 持ち帰る視点`）を書かせ、サーバが区切り以降を delta に流さず done へ (b) 語りの後に構造化出力の呼び出しをもう1回 (c) 全体を JSON で一括生成しサーバで刻んで送る
- 選択：(a)（`services/gemini.py` の `_TakeawaySplitter`。区切りが無ければ error 502）
- 理由：呼び出しが1回なので待ち時間とコストが増えない + 語りと視点を同じ文脈で書かせるので、両者の内容がずれにくい
- 捨てた理由：(b) done が数秒遅れ、コスト2倍、本文と視点がずれうる (c) 最初の1文字まで全文の生成を待つ
- 見直し条件：

## D-09 語りに渡す画像（2026-11-07 / ）
- 候補：(a) 全体写真 + 主役の box 座標をテキストで指定 (b) 主役の切り抜きのみ (c) 全体 + 切り抜きの2枚
- 選択：(a)（`prompts/narration.py`）
- 理由：周囲の文脈が語りの材料になるし、画像が1枚で済むので切り抜き処理も要らなく、analyzeと同じ写真を使い回せる
- 捨てた理由：(b) 周囲の文脈（建物の種類など）が消える (c) 入力トークンが増え遅くなる
- 見直し条件：

## D-10 Gemini 通信切断の扱い（2026-11-07 / ）
- 候補：(a) `httpx2.TransportError` を明示して捕まえ、理由付きの 503 / error イベントにする（httpx2 を requirements に直接指定） (b) GeminiError 以外の例外を広く捕まえて 503 にする
- 選択：(a)（`services/gemini.py` の `_connection_error`。D-05 に合わせ再試行はしない）
- 理由：AGENTS.md の「例外を握りつぶさない」「失敗には理由を付ける」に沿う
- 捨てた理由：(b) 自分のバグなど通信以外の失敗も 503 に見えてしまう
- 見直し条件：

## D-11 抽選候補が0件のときの選び直し（2026-11-07 / ）
- 候補：(a) 0件のときだけ `whole` を外して選び直す（`sure && fixture && salience>=3` は維持） (b) 0件のとき `whole` と `salience>=3` の両方を外す (c) 段階的に緩める（まず whole、それでも0件なら salience も） (d) 緩めず、フロントで「主役が見つからない」と出す
- 選択：(a)（`services/lineup.py` の `build_lineup`）。語りは当面ふだんのプロンプトのまま。選び直しを narrate に伝えて連想・起源寄りに切り替えるかは結果を見て決める
- 理由：目立ち度の条件は残すので、小さな物は選ばれない。また、0件になるのはまれなので、普段の挙動は変えずに保険として入れられる
- 捨てた理由：(b) 小さな脇役が主役になり「どれのこと？」になりやすい (c) ロジックとテストが増える (d) 審査員が当たると体験が止まる
- 見直し条件：

## D-12 語りプロンプトの話題の選び方（2026-11-07 / ）
- 候補：(a) v1：「構造・仕組み・決まりごと・作られ方のどれか1つ」 (b) v2：①構造・決まりごと → ①で乏しければ ②一段だけ広げた大きな仕組み → ③起源・移り変わり（出典が取れた場合のみ）の順で選ぶ (c) v2 に「この個体がそうだとは言い切らない」を足す
- 選択：(b)（`prompts/narration.py`。テスト10枚の比較で使った文言そのまま）
- 理由：テスト時、出典が付いた語りがv1の6本から12本に増え、裏取りして出典を付けれる割合が上がった。また、構造の話で終わらず、目の前の物から仕組みへ一歩広がる語りが出るようになり、①で話が乏しい物でも、②仕組みや③起源で話を作れるので、植木のような弱い候補でも語りが薄くなりにくい
- 捨てた理由：(a) テスト10枚で出典付きの語りが 21本中6本（v2 は12本） (c) 未検証の文言になる
- 見直し条件：
