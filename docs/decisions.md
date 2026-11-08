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

## D-13 feedback の保存設計（2026-11-07 / ）
- 候補：レスポンス (a) 204 (b) 201 + feedback_id (c) 200 + ok／保存先 (a) トップレベル `feedback` (b) `sessions/{id}/feedback` (c) session に追記／再送 (a) `{session_id}_{pick_id}` で上書き (b) 全部残す／検証 (a) session と lineup を確認 (b) 型だけ (c) session だけ (d) 語った主役か確認／一緒に保存 (a) 4項目＋時刻 (b) 語りの本文も (c) 主役の name/detail を写す (d) プロンプトの版 (e) フロントから本文を送る
- 選択：204／トップレベル `feedback`／上書き／session と lineup を確認／主役の name/detail を写す。comment は任意・500 文字まで（`routers/feedback.py`、`services/feedback.py`）
- 理由：
    レスポンス：204
    フロントは成功か失敗かが分かれば十分で、返す値の使い道が今はない
    本文がないので、フロント側の処理がシンプルになる

    保存先：トップレベルの feedback
    後で「fishy が多いのはどんな主役か」を集計するとき、1か所にまとまっている方が扱いやすい

    再送：{session_id}_{pick_id} で上書き
    押し間違えて付け直したり、連打したりしても1票のままで、集計が歪まない

    検証：sessionとlineupを確かめる
    narrateと同じルール（候補の物だけ）にそろえて、存在しない主役への評価が混ざらないようにする

    一緒に保存：主役のname/detailを写す
    sessionを辿らなくても、feedbackを見るだけでどの物への評価かが分かる
    検証のためにsessionを読むので、そのついでに写すだけで追加のコストがほぼない

    comment：任意・500文字まで
    絵文字だけ押す人が大半なので任意にし、いたずらで巨大な文字列を保存されないよう上限を付けた
- 捨てた理由：201・200 は返す値の使い道が今は無い。サブコレクションや session 追記は全体の集計がしにくい。全部残すと連打で票が増える。型だけの検証はでたらめな ID でも保存できる。語りの本文やプロンプトの版は narrate 側の変更が要るので、語りの改善で別途検討
- 見直し条件：

## D-14 語り開始後のレイアウト切り替え方式（2026-11-07 / ）
- 候補：(a) 1ページ内で state（語りの有無）により部品の並びを切り替える (b) `/story` ルートへ遷移し、session_id と pick_id を URL に持つ (c) 候補画面に「戻る」ボタンを置いて2画面を行き来する
- 選択：(a)。語り開始後は HeroCrop → 語り → 持ち帰る視点 → 候補チップ → 元画像（折りたたみ）の順。「戻る」は置かず、候補チップのタップで語り直す。チップは lineup の候補のみ（ルール7のまま）
- 理由：
- 捨てた理由：(b) 写真は backend から取り直せない（GCS の gs:// のみ）ので blob URL と解析結果を Context か sessionStorage に持ち回る必要があり、リロードで消える。静的エクスポートではクエリをクライアントで読む手間も増える (c) 画面往復が増え、スマホで「読む → 評価する → 次の主役」の流れが途切れる
- 見直し条件：

## D-16 画面遷移のアニメーション方式（2026-11-08 / ）
- 候補：(a) React 19 の `ViewTransition` コンポーネント（Next.js では `experimental.viewTransition: true` が必要） (b) CSS の `@starting-style` と transition / keyframes だけで入場・切り替えを作る (c) アニメーションライブラリ（motion など）を追加する
- 選択：(b)。`.enter`（@starting-style のフェード＋8px スライド）、`.lock-on` / `.pulse-ring`（SVG の枠）、`.scanline` / `.scan-dot`（待機中の装飾）を `globals.css` に置き、`prefers-reduced-motion: reduce` では duration と delay を 0 にして装飾層（`.decor`）を消す
- 理由：
- 捨てた理由：(a) Next.js 公式が本番非推奨と明記する experimental フラグで、凍結前日に入れる判断ができない（https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition） (c) 入場と枠の動きだけなら CSS で足り、依存とバンドル（motion は全体で約 34KB）を増やす理由がない
- 見直し条件：

## D-17 写真解析の待機表示（2026-11-08 / ）
- 候補：(a) 経過秒のカウンタ（「検出中… 12秒」） (b) 擬似進捗バー（実測の分布に合わせて 85% まで進め、応答で 100%） (c) サーバの処理順と同じ 3 段階のメッセージ（写真を読んでいます → 写っている物を数えています → 主役を選んでいます）＋写真の上の装飾（走査線 → 格子と点灯）＋観察ヒント 1 枚
- 選択：(c)。段階 1→2 は 3 秒で切り替え、段階 3 は応答後に枠が 1 個ずつ現れる間（最大約 2 秒）だけ出す。ヒントは `lib/hints.ts` の 10 本から写真ごとに 1 本（直前と同じ物は避ける）。25 秒を超えたら「もう少しかかっています」、60 秒で「時間がかかっています。電波の良い所でもう一度お試しください」と中断ボタン（AbortController）を出す
- 理由：
- 捨てた理由：(a) 増える秒数を見せるだけで待ちが長く感じる (b) 実際の進捗ではない数字を出すことになり、85% で止まる挙動は見る人に「正直でない」と映る
- 見直し条件：analyze の応答時間の分布が変わったら 3 秒 / 25 秒 / 60 秒のしきい値を見直す（2026-11-08 の実測は 23・36・89 秒）。Cloud Run 上で 60 秒超が珍しくなければ、中断より先にサーバ側のタイムアウトと再試行を検討する

## D-18 本文フォント（2026-11-08 / ）
- 候補：(a) システムフォントのまま（iOS: ヒラギノ / Android: Noto Sans CJK / Windows: 游ゴシック・メイリオ） (b) Noto Sans JP を `next/font/google` でビルド時に自己ホスト (c) 別の Web フォント（M PLUS、BIZ UDPGothic など）
- 選択：(b)。`layout.tsx` で `Noto_Sans_JP`（可変ウェイト、`display: swap`）を読み、`@theme` の `--font-sans` に当てる。実行時に Google Fonts へは接続しない（https://nextjs.org/docs/app/api-reference/components/font）
- 理由：
- 捨てた理由：(a) 端末ごとに見た目が変わり、Windows ではデモ録画の字面が崩れる (c) 可読性と太字のバリエーションで Noto Sans JP に劣るか、好みの域を出ない
- 見直し条件：

## D-19 PWA の構成（2026-11-08 / ）
- 候補：(a) manifest（`app/manifest.ts`）＋アイコン＋`appleWebApp` メタだけ。ホーム画面に追加でき、standalone で開く。Service Worker なし (b) (a) に加えて Service Worker でシェルをキャッシュ（Serwist / next-pwa 等） (c) PWA 化しない
- 選択：(a)。アイコンは自作 SVG（丸地に「散」、moss 色）をヘッドレスブラウザで 192 / 512 / maskable 512 / apple-touch 180 の PNG に書き出して `public/icons/` に置く。favicon は `app/icon.svg`
- 理由：
- 捨てた理由：(b) 写真の解析も語りも通信が必須でオフラインの価値が薄く、Service Worker のキャッシュ更新の不具合は凍結前日に切り分ける余裕がない。ライブラリ追加も要る (c) アドレスバーが残ったままでは「アプリ感」が出ず、J1 の実機確認の前提も満たせない
- 見直し条件：
