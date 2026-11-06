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
- `lineup[]`: 抽選候補の `objects[].id`（`sure && kind==fixture && whole && salience>=3` を `(potential, salience)` 降順で最大3件）
- EXIF GPS はレスポンスにも列挙プロンプトにも含めず、session にだけ保存する

## エラー

- 画像として読めない場合は 400
- Gemini が 429/503 を返し、再試行（1s, 3s の最大2回）でも回復しない場合は 503。本文に理由を付ける

- Gemini の出力が Pydantic でパースできない場合は 502。本文に理由を付ける
