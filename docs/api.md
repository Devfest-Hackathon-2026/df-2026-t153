# API 契約

正は `backend/schemas.py`。変更するときは schemas.py を先に直し、この表を追従させる。

| メソッド | パス | リクエスト | レスポンス |
|---|---|---|---|
| GET | `/health` | なし | `{status: "ok"}` |
| POST | `/api/analyze` | multipart/form-data（`image`: 写真。JPEG/PNG/HEIC 等） | JSON `{session_id, scene, objects[], texts[], lineup[]}` |
| GET | `/api/narrate` | query `session_id`, `pick_id` | SSE（`event: meta \| delta \| done \| error`） |
| POST | `/api/feedback` | JSON `{session_id, pick_id, rating, comment}`（`rating`: `boring \| fishy \| great`） | 204（本文なし） |

### /api/analyze の中身

- `objects[]`: `{id, name, salience 1-5, detail, sure, kind: fixture|transient|person, box [x1,y1,x2,y2] 0-1000, whole, potential 1-5}`
- `texts[]`: `{content, where}`。Gemini が texts に入れ忘れた文字は、サーバが objects[].detail から補う（where は object の name）
- `lineup[]`: 抽選候補の `objects[].id`（`sure && kind==fixture && whole && salience>=3` を `(potential, salience)` 降順で最大3件）。1件も無いときだけ `whole` を外して選び直す（D-11）。それでも無ければ空配列
- EXIF GPS はレスポンスにもプロンプトにも含めず、保存もしない（D-42）
- GPS があれば、丸める前の座標で国土地理院の逆ジオコーダから町名を引き、丁目を落として session の `place` に保存する（D-37）。座標そのものは送るだけで残さない

### /api/narrate の中身

ストリーム開始後はヘッダ送信済みのため、失敗はすべて HTTP 200 の `error` イベントで返す。`data` はすべて JSON。

| event | data | 回数 |
|---|---|---|
| `meta` | `{pick_id, name, box, place}` | 1 |
| `delta` | 語りの断片（JSON 文字列。連結すると本文） | 複数 |
| `done` | `{takeaway, sources[{title, uri}], search_entry_html}` | 1（最後） |
| `error` | `{status, detail}`（status は HTTP 相当：404 session なし / 400 pick_id が lineup 外 / 502 / 503） | 0〜1（来たら終了） |

- `pick_id` は `lineup[]` に含まれるものだけ受け付ける
- `takeaway`：次の散歩で転用できる観察パターン1文。モデルが本文の後に出す区切り行（`### 持ち帰る視点`）以降をサーバが切り出し、delta には流さない。フロントは 2026-11-09 から表示していない（D-40）。契約としては残す
- `sources`：Search grounding の出典。`uri` は Vertex AI のリダイレクト URL
- 最初の文字が `NARRATE_FIRST_TOKEN_TIMEOUT`（12 秒）で来なければ grounding なしで呼び直す（D-32）。このときは `sources` が空で、語りは見える特徴・役目と、現地で確かめる点の問いかけだけになる（D-36）
- `search_entry_html`：Google 検索候補（Search Suggestions）の表示用 HTML（`searchEntryPoint.renderedContent` をそのまま）。Search grounding を使った応答では**表示が必須**（"you must display the Search Suggestions in production"）。改変せず、応答と同じ幅で、応答が見えている間は出し続ける。タップは検索結果ページへ直行させる。フロントは sandbox 付き iframe で描画（`components/SearchSuggestions.tsx`、D-26）。要件：https://docs.cloud.google.com/vertex-ai/generative-ai/docs/grounding/grounding-search-suggestions
- GPS は語りのプロンプトに渡さない。撮影地点は常に「不明」として渡す（D-42）
- `meta.place`：撮影地点の町名（例：西新宿）。GPS が無い・町名が引けないときは null（D-37）

### /api/feedback の中身

- `comment` は任意（省略時は空文字）、500 文字まで
- `pick_id` は `lineup[]` に含まれるものだけ受け付ける（session なし 404 / lineup 外 400 / 値が不正 422）
- Firestore の `feedback/{session_id}_{pick_id}` に保存。同じ主役への再送は上書き
- 保存時に主役の `name` / `detail` を `pick_name` / `pick_detail` として写す（session を辿らずに集計できるように）

## エラー

- 写真が 10 MB を超える場合は 413（`{"detail": "image too large"}`）
- 画像として読めない、または 6,000 万画素を超える場合は 400（`{"detail": "image decode failed"}`）
- `detail` は固定文だけ返す（analyze：`analysis failed` / `upstream unavailable`、narrate の `error`：`narration failed` / `upstream unavailable` / `photo unavailable`）。Gemini の生のエラーや例外文はログにだけ残す
- Gemini が 429/503 を返し、再試行（1s, 3s の最大2回）でも回復しない場合は 503
- Gemini との通信が切れた場合も 503（再試行はしない）
- analyze：Gemini が 40 秒応答しなければ 1 回だけ呼び直し、それでも応答しなければ 503（D-33）
- narrate：最初の文字が 12 秒で来なければ grounding なしに切り替え、それも 30 秒来なければ `error` 503（D-32）。本文の途中で 25 秒止まった場合も `error` 503（送った本文と重なるので呼び直さない、D-33）
- narrate：想定外の例外でも必ず `error` イベント（500、`detail` は固定文）を送ってから閉じる

- Gemini の出力が Pydantic でパースできない場合は 502
