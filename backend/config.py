import json
import logging
import os
import tempfile
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


def _flag(name: str) -> bool:
    return os.environ.get(name, "") == "1"


@dataclass(frozen=True)
class Settings:
    gcp_project: str
    gcp_location: str
    gemini_flash_model: str
    allowed_origins: list[str]
    firestore_disabled: bool
    storage_disabled: bool
    photo_bucket: str
    local_photo_dir: Path
    # Seconds to wait for the first narration token with Search grounding before
    # retrying without it (D-32)
    narrate_first_token_timeout: float


@lru_cache
def get_settings() -> Settings:
    return Settings(
        gcp_project=os.environ.get("GOOGLE_CLOUD_PROJECT", ""),
        gcp_location=os.environ.get("GOOGLE_CLOUD_LOCATION", ""),
        gemini_flash_model=os.environ.get("GEMINI_FLASH_MODEL", ""),
        allowed_origins=[
            o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()
        ],
        firestore_disabled=_flag("FIRESTORE_DISABLED"),
        storage_disabled=_flag("STORAGE_DISABLED"),
        photo_bucket=os.environ.get("PHOTO_BUCKET", ""),
        narrate_first_token_timeout=float(os.environ.get("NARRATE_FIRST_TOKEN_TIMEOUT", "12")),
        local_photo_dir=Path(tempfile.gettempdir()) / "sanpolab-photos",
    )


class _JsonFormatter(logging.Formatter):
    # Cloud Logging parses one JSON object per line into structured fields
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "severity": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
        }
        extra = getattr(record, "fields", None)
        if isinstance(extra, dict):
            payload.update(extra)
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False, default=str)


def setup_logging() -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(_JsonFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)
    # httpx2 logs every request URL at INFO; the reverse geocoder's URL carries the unrounded
    # photo location, which D-34 keeps out of storage (D-36)
    logging.getLogger("httpx2").setLevel(logging.WARNING)
