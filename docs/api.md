# API 契約

正は `backend/schemas.py`。変更するときは schemas.py を先に直し、この表を追従させる。

| メソッド | パス | リクエスト | レスポンス |
|---|---|---|---|
| GET | `/healthz` | なし | `{status: "ok"}` |
| POST | `/api/analyze` | multipart/form-data（`image`: 写真。JPEG/PNG/HEIC 等） | JSON `{session_id, scene, objects[], texts[], lineup[]}` |
| GET | `/api/narrate` | query `session_id`, `pick_id` | SSE（`event: meta \| delta \| done \| error`） |
| POST | `/api/feedback` | JSON `{session_id, pick_id, rating, comment}`（`rating`: `boring \| fishy \| great`） | 未定 |

### /api/analyze の中身

- `objects[]`: `{id, name, salience 1-5, detail, sure, kind: fixture|transient|person, box [x1,y1,x2,y2] 0-1000, whole, potential 1-5}`
- `texts[]`: `{content, where}`。Gemini が texts に入れ忘れた文字は、サーバが objects[].detail から補う（where は object の name）
- `lineup[]`: 抽選候補の `objects[].id`（`sure && kind==fixture && whole && salience>=3` を `(potential, salience)` 降順で最大3件）。1件も無いときだけ `whole` を外して選び直す（D-11）。それでも無ければ空配列
- EXIF GPS はレスポンスにも列挙プロンプトにも含めず、session にだけ保存する

### /api/narrate の中身

ストリーム開始後はヘッダ送信済みのため、失敗はすべて HTTP 200 の `error` イベントで返す。`data` はすべて JSON。

| event | data | 回数 |
|---|---|---|
| `meta` | `{pick_id, name, box}` | 1 |
| `delta` | 語りの断片（JSON 文字列。連結すると本文） | 複数 |
| `done` | `{takeaway, sources[{title, uri}], search_entry_html}` | 1（最後） |
| `error` | `{status, detail}`（status は HTTP 相当：404 session なし / 400 pick_id が lineup 外 / 502 / 503） | 0〜1（来たら終了） |

- `pick_id` は `lineup[]` に含まれるものだけ受け付ける
- `takeaway`：次の散歩で転用できる観察パターン1文。モデルが本文の後に出す区切り行（`### 持ち帰る視点`）以降をサーバが切り出し、delta には流さない
- `sources`：Search grounding の出典。`uri` は Vertex AI のリダイレクト URL
- `search_entry_html`：Google 検索候補の表示用 HTML。grounding 利用時は表示が求められている（要件は未確認：https://docs.cloud.google.com/vertex-ai/generative-ai/docs/grounding/grounding-search-suggestions）
- GPS は語りのプロンプトにだけ渡す

## エラー

- 画像として読めない場合は 400
- Gemini が 429/503 を返し、再試行（1s, 3s の最大2回）でも回復しない場合は 503。本文に理由を付ける
- Gemini との通信が切れた・タイムアウトした場合も 503（再試行はしない）。本文に理由を付ける

- Gemini の出力が Pydantic でパースできない場合は 502。本文に理由を付ける
