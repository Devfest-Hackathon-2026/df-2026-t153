# backend への引き継ぎ（セキュリティ・運用）

2026-11-08 のコードレビューで見つかった、backend 側で直してほしい点。各項目は「現状／リスク／修正案／確認方法」の順。
優先度の高い順に並べてある。コードは触っていないので、着手時に実装者が判断してよい。

## 1. API の `detail` に内部情報が出る（優先：高）

**現状**
- `routers/analyze.py`：`HTTPException(status_code=400|502|503, detail=str(e))`
- `routers/narrate.py`：`_error(session_id, status, str(e))` と `f"photo load failed: {e}"`
- `str(e)` には次が入る：Gemini API の生のエラー文（モデル名・クォータ情報）、Pydantic の `ValidationError`（＝Gemini の出力そのもの）、`photo load failed` の例外文（GCS のバケット名・ローカルパス）

**リスク**
- 内部構成（モデル名・バケット名・パス）と、ユーザーに見せる前のモデル出力が、誰でも叩ける API の応答に出る
- フロントは #14 以降 `detail` を画面に出さなくなったが、API を直接叩けば見える

**修正案**
- 応答の `detail` は固定文にし、詳細はログだけに残す。例：
  - 400 → `"image decode failed"`
  - 502 → `"analysis failed"` / `"narration failed"`
  - 503 → `"upstream unavailable"`
  - narrate の photo load → `"photo unavailable"`（status 500 のまま）
- ログ側は今の `extra={"fields": {"error": str(e)}}` のままでよい（`log.error` / `log.exception`）

**確認方法**
- `curl -F image=@not_an_image.txt .../api/analyze` → `{"detail":"image decode failed"}` のみ
- `tests/` に「detail に `ValidationError` の文字列が含まれない」の 1 本を足すなら `schemas` のテストと同じ場所

## 2. アップロードの上限がなく、巨大画像で 500 になる（優先：高）

**現状**
- `await image_file.read()` を無制限に読む。Cloud Run の 32 MiB 制限だけが上限
- `services/image.py` の `prepare()` は `UnidentifiedImageError, OSError` だけ捕まえる。Pillow の `Image.DecompressionBombError`（画素数が既定の約 1.8 億を超える）は `OSError` の子ではないので素通りし、**500** になる
- `MAX_IMAGE_PIXELS` の警告（約 8,900 万画素超）はログに出るだけ

**リスク**
- 小さなファイルサイズでも画素数が巨大な PNG（例：20000×20000）でメモリと CPU を使わせられる。1 GiB のインスタンスでは OOM で再起動する
- 32 MiB 近いファイルを連投されると Gemini 呼び出し前に時間と帯域を消費する

**修正案**
- `Content-Length` を見て 15 MiB 超は 413（`HTTPException(413, "image too large")`）。`UploadFile` を分割読みして上限で切るなら `await image_file.read(MAX + 1)` で長さを見る
- `prepare()` で `Image.DecompressionBombError` も捕まえて `ImageDecodeError` にする（→ 400）
- フロントは 413 と 400 を既に区別して表示する（`lib/errors.ts`）

**確認方法**
- `python -c "from PIL import Image; Image.new('1',(20000,20000)).save('bomb.png')"` を送って 400 が返り、ログに 500 が無い
- 16 MiB のダミーファイルを送って 413

## 3. 公開後のレート制限と課金上限（優先：中）

**現状**
- `allUsers` に `run.invoker` を付けて公開済み。`max-instances` は未指定（既定 100）、`concurrency` も既定
- Gemini 呼び出しに利用者側の制限は無い。`/api/analyze` 1 回 ≒ Gemini 1 回、`/api/narrate` 1 回 ≒ Gemini 1 回＋検索

**リスク**
- スクリプトで叩かれると Gemini の課金が上限なく増える。デモ期間（〜11/14）の URL は公開されるので、起こりうる

**修正案（段階的に）**
1. `scripts/deploy-backend.sh` に `--max-instances 3 --concurrency 20` を追加（これだけで同時実行が 60 に頭打ち）
2. 予算アラート：Cloud Billing の budget を 1 つ（例：5,000 円で 50/90/100% 通知）。`billingbudgets.googleapis.com` の有効化が要る
3. 余裕があれば：セッション単位の narrate 回数上限（session に `narrate_count` を持ち、lineup 数 × 3 を超えたら 429）

**確認方法**
- `gcloud run services describe sanpolab-api --region asia-northeast1 --format="value(spec.template.metadata.annotations)"` に `autoscaling.knative.dev/maxScale: '3'`
- Cloud Console → お支払い → 予算とアラートに 1 件

## 4. 位置情報と写真の保持期限がない（優先：中）

**現状**
- `routers/analyze.py` は EXIF の GPS を `sessions/{id}.gps = {lat, lon}` として Firestore に保存（語りのプロンプトに使う）
- 写真は `gs://sanpolab-photos/sessions/{id}.jpg`（EXIF は落としてある。これは良い）
- Firestore の TTL ポリシー、GCS のライフサイクルルールとも未設定

**リスク**
- 個人の居場所（自宅前で撮った写真の座標など）が無期限に残る。削除の手段もユーザーに無い
- ハッカソンの稼働義務は 11/14 まで。それ以降もデータだけ残る

**修正案**
- Firestore：`sessions` と `feedback` に TTL ポリシー（フィールド `created_at`、7 日）。`gcloud firestore fields ttls update created_at --collection-group=sessions --enable-ttl`
- GCS：`gsutil lifecycle set` で `age: 7` の Delete ルール
- 可能なら `gps` は保存せず、プロンプトに渡した後に捨てる（narrate が後から読むので、保存が要るなら小数第 2 位で丸めて約 1 km の粒度にする）

**確認方法**
- `gcloud firestore fields ttls list --collection-group=sessions`
- `gcloud storage buckets describe gs://sanpolab-photos --format="value(lifecycle)"`

## 5. その他（低）

- `services/gemini.py` の narration ログに `search_queries` を全部出している。GPS から土地柄を語らせているので、クエリに地名が入ることがある。ログの保持期間（既定 30 日）を意識しておけば十分
- `/api/feedback` はフロントから使っていない。残すなら有効な `session_id` を知っている人が何度でも書けることを承知の上で（上書きなので件数は増えない）
- `search_entry_html` はフロントで描画を始めた（#15 予定）。サーバ側は `rendered_content` をそのまま渡すだけでよい。改変しないことが Google の要件

## 問題なしと確認したもの

- `session_id` は `uuid4().hex`（推測不能）。narrate / feedback は lineup 内の `pick_id` しか受けない
- CORS は `ALLOWED_ORIGINS` の明示オリジンのみ。`allow_credentials` なし
- 秘密情報のコミットなし。`.gcloudignore` が `.env*` と SA キーを除外
- `/health` は固定の JSON のみ
