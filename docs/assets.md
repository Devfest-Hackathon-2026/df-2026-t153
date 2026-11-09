# Assets / Libraries

追加したライブラリ・素材・データの出典とライセンス（著作物利用シートの元）。
ライセンスは各リポジトリの LICENSE で確認してから「確認済」にする（確認日と見た URL を書く）。

## Backend（Python）

| 名前 | 用途 | 出典 | ライセンス | 確認 |
|---|---|---|---|---|
| FastAPI | Web フレームワーク | https://github.com/fastapi/fastapi | MIT | 確認済（2026-11-08、https://github.com/fastapi/fastapi/blob/master/LICENSE）|
| Uvicorn | ASGI サーバ | https://github.com/encode/uvicorn | BSD-3-Clause | 確認済（2026-11-08、https://github.com/Kludex/uvicorn/blob/main/LICENSE.md）|
| python-multipart | multipart 受信 | https://github.com/Kludex/python-multipart | Apache-2.0 | 確認済（2026-11-08、https://github.com/Kludex/python-multipart/blob/main/LICENSE.txt）|
| google-genai | Vertex AI Gemini SDK | https://github.com/googleapis/python-genai | Apache-2.0 | 確認済（2026-11-08、https://github.com/googleapis/python-genai/blob/main/LICENSE）|
| httpx2 | Gemini 通信切断の例外を捕まえる（google-genai の依存を直接指定） | https://github.com/pydantic/httpx2 | BSD-3-Clause | 確認済（2026-11-08、https://github.com/pydantic/httpx2/blob/main/LICENSE.md）|
| google-cloud-firestore | Firestore クライアント | https://github.com/googleapis/python-firestore | Apache-2.0 | 確認済（2026-11-08、https://github.com/googleapis/python-firestore/blob/main/LICENSE）|
| google-cloud-storage | Cloud Storage クライアント | https://github.com/googleapis/python-storage | Apache-2.0 | 確認済（2026-11-08、https://github.com/googleapis/python-storage/blob/main/LICENSE）|
| Pillow | 画像処理 | https://github.com/python-pillow/Pillow | MIT-CMU (HPND) | 確認済（2026-11-08、https://github.com/python-pillow/Pillow/blob/main/LICENSE）|
| pillow-heif | HEIC 読み込み | https://github.com/bigcat88/pillow_heif | BSD-3-Clause（同梱 libheif は LGPL-3.0） | 確認済（2026-11-08、https://github.com/bigcat88/pillow_heif/blob/master/LICENSE.txt（libheif: https://github.com/strukturag/libheif/blob/master/COPYING））|
| Ruff | lint / format（開発のみ） | https://github.com/astral-sh/ruff | MIT | 確認済（2026-11-08、https://github.com/astral-sh/ruff/blob/main/LICENSE）|
| mypy | 型検査（開発のみ） | https://github.com/python/mypy | MIT（mypyc の一部ファイルは PSF-2.0） | 確認済（2026-11-08、https://github.com/python/mypy/blob/master/LICENSE）|
| pytest | テスト（開発のみ） | https://github.com/pytest-dev/pytest | MIT | 確認済（2026-11-08、https://github.com/pytest-dev/pytest/blob/main/LICENSE）|

## Frontend（Node）

| 名前 | 用途 | 出典 | ライセンス | 確認 |
|---|---|---|---|---|
| Next.js | フレームワーク | https://github.com/vercel/next.js | MIT | 確認済（2026-11-08、https://github.com/vercel/next.js/blob/canary/license.md）|
| React / React DOM | UI | https://github.com/facebook/react | MIT | 確認済（2026-11-08、https://github.com/facebook/react/blob/main/LICENSE）|
| Tailwind CSS | スタイル | https://github.com/tailwindlabs/tailwindcss | MIT | 確認済（2026-11-08、https://github.com/tailwindlabs/tailwindcss/blob/main/LICENSE）|
| TypeScript | 型 | https://github.com/microsoft/TypeScript | Apache-2.0 | 確認済（2026-11-08、https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt）|
| ESLint / eslint-config-next | lint（開発のみ） | https://github.com/eslint/eslint | MIT | 確認済（2026-11-08、https://github.com/eslint/eslint/blob/main/LICENSE（eslint-config-next は next.js と同じ license.md））|
| Prettier | format（開発のみ） | https://github.com/prettier/prettier | MIT | 確認済（2026-11-08、https://github.com/prettier/prettier/blob/main/LICENSE）|
| openapi-typescript | OpenAPI から API 型を生成（開発のみ） | https://github.com/openapi-ts/openapi-typescript | MIT | 確認済（2026-11-08、https://github.com/openapi-ts/openapi-typescript/blob/main/LICENSE）|

## Tooling

| 名前 | 用途 | 出典 | ライセンス | 確認 |
|---|---|---|---|---|
| pre-commit | Git フック | https://github.com/pre-commit/pre-commit | MIT | 確認済（2026-11-08、https://github.com/pre-commit/pre-commit/blob/main/LICENSE）|

## 素材（画像・音声・フォント・データ）

| 名前 | 用途 | 出典 | ライセンス | 確認 |
|---|---|---|---|---|
| Noto Sans JP | 本文フォント（next/font/google でビルド時に取得し自己ホスト） | https://fonts.google.com/noto/specimen/Noto+Sans+JP | SIL Open Font License 1.1 | 確認済（2026-11-08、https://github.com/notofonts/noto-cjk/blob/main/Sans/LICENSE）|
| Noto Serif JP | 語り・雑学の本文（next/font/google でビルド時に取得し自己ホスト） | https://fonts.google.com/noto/specimen/Noto+Serif+JP | SIL Open Font License 1.1 | 確認済（2026-11-08、https://github.com/notofonts/noto-cjk/blob/main/Serif/LICENSE）|
| アプリアイコン「散」 | PWA / favicon（`frontend/public/icons/`, `app/icon.svg`） | 自作（このリポジトリ） | リポジトリと同じ | 確認済 |
| 国土地理院 逆ジオコーダ（LonLatToAddress） | 撮影地点の町名（`backend/services/geocode.py`、D-37） | https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress | 未確認（公式の利用規約ページが見つからない） | 未確認（2026-11-09。デモ期間のみの利用） |
| Shippori Mincho | 主役の名前・見出し・ボタンの書体（next/font/google でビルド時に取得し自己ホスト、D-39） | https://fonts.google.com/specimen/Shippori+Mincho | SIL Open Font License 1.1 | 確認済（2026-11-09、https://github.com/fontdasu/ShipporiMincho/blob/master/OFL.txt）|
