# API 契約

正は `backend/schemas.py`。変更するときは schemas.py を先に直し、この表を追従させる。

| メソッド | パス | リクエスト | レスポンス |
|---|---|---|---|
| GET | `/healthz` | なし | `{status: "ok"}` |
| POST | `/api/analyze` | multipart/form-data（`file`: 写真） | JSON `{session_id, scene, objects[], texts[], lineup[]}` |
| GET | `/api/narrate` | query `session_id`, `pick_id` | SSE（`event: meta \| delta \| done \| error`） |
| POST | `/api/feedback` | JSON `{session_id, pick_id, rating, comment}`（`rating`: `boring \| fishy \| great`） | 未定 |

## エラー

- Gemini の出力が Pydantic でパースできない場合は 502。本文に理由を付ける
