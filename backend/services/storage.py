import asyncio
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import url2pathname

from google.cloud.storage import Bucket, Client

from config import get_settings


@lru_cache
def _bucket() -> Bucket:
    s = get_settings()
    if not s.photo_bucket:
        raise RuntimeError("PHOTO_BUCKET is not set (or set STORAGE_DISABLED=1)")
    return Client(project=s.gcp_project or None).bucket(s.photo_bucket)


def _save_sync(session_id: str, jpeg: bytes) -> str:
    s = get_settings()
    name = f"sessions/{session_id}.jpg"
    if s.storage_disabled:
        path = s.local_photo_dir / f"{session_id}.jpg"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(jpeg)
        return path.as_uri()
    _bucket().blob(name).upload_from_string(jpeg, content_type="image/jpeg")
    return f"gs://{s.photo_bucket}/{name}"


async def save_photo(session_id: str, jpeg: bytes) -> str:
    # GCS client is sync-only; keep it off the event loop
    return await asyncio.to_thread(_save_sync, session_id, jpeg)


def _load_sync(photo_uri: str) -> bytes:
    if photo_uri.startswith("file://"):
        return Path(url2pathname(urlparse(photo_uri).path)).read_bytes()
    bucket, _, name = photo_uri.removeprefix("gs://").partition("/")
    client = Client(project=get_settings().gcp_project or None)
    data: bytes = client.bucket(bucket).blob(name).download_as_bytes()
    return data


async def load_photo(photo_uri: str) -> bytes:
    """save_photo が返した URI（file:// か gs://）から JPEG を読む。"""
    return await asyncio.to_thread(_load_sync, photo_uri)
