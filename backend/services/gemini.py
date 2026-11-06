import asyncio
import logging
import time
from functools import lru_cache

from google import genai
from google.genai import errors, types
from pydantic import ValidationError

from config import get_settings
from prompts.inventory import INVENTORY_PROMPT
from schemas import Inventory

log = logging.getLogger(__name__)

# D-03: LOW was ~3x faster than the default MEDIUM with no loss in coverage on sample.jpg
THINKING_LEVEL = types.ThinkingLevel.LOW
# D-05: retry only transient quota/availability errors; delays before retry 1 and 2
RETRY_STATUS = (429, 503)
RETRY_DELAYS = (1.0, 3.0)


class GeminiError(RuntimeError):
    """Gemini 呼び出しまたは出力パースの失敗。ルーターで 502 にする。"""


class GeminiUnavailableError(GeminiError):
    """429/503 が再試行後も続いた。ルーターで 503 にする。"""


@lru_cache
def _client() -> genai.Client:
    s = get_settings()
    return genai.Client(vertexai=True, project=s.gcp_project, location=s.gcp_location)


async def _generate(jpeg: bytes) -> tuple[types.GenerateContentResponse, int]:
    s = get_settings()
    for attempt in range(len(RETRY_DELAYS) + 1):
        try:
            res = await _client().aio.models.generate_content(
                model=s.gemini_flash_model,
                contents=types.Content(
                    role="user",
                    parts=[
                        types.Part.from_bytes(data=jpeg, mime_type="image/jpeg"),
                        types.Part.from_text(text=INVENTORY_PROMPT),
                    ],
                ),
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=Inventory,
                    thinking_config=types.ThinkingConfig(thinking_level=THINKING_LEVEL),
                ),
            )
            return res, attempt
        except errors.APIError as e:
            if e.code not in RETRY_STATUS:
                raise GeminiError(f"Gemini API error {e.code}: {e.message}") from e
            if attempt == len(RETRY_DELAYS):
                log.error(
                    "gemini retries exhausted",
                    extra={"fields": {"status": e.code, "retries": attempt}},
                )
                raise GeminiUnavailableError(
                    f"Gemini API error {e.code} after {attempt} retries: {e.message}"
                ) from e
            log.warning(
                "gemini retry",
                extra={"fields": {"status": e.code, "retry": attempt + 1}},
            )
            await asyncio.sleep(RETRY_DELAYS[attempt])
    raise AssertionError("unreachable")


async def list_inventory(jpeg: bytes) -> Inventory:
    t0 = time.perf_counter()
    res, retries = await _generate(jpeg)
    log.info(
        "gemini inventory",
        extra={
            "fields": {
                "model": get_settings().gemini_flash_model,
                "retries": retries,
                "elapsed_ms": round((time.perf_counter() - t0) * 1000),
            }
        },
    )
    if not res.text:
        reason = res.candidates[0].finish_reason if res.candidates else "no candidates"
        raise GeminiError(f"Gemini returned empty output (finish_reason={reason})")
    try:
        return Inventory.model_validate_json(res.text)
    except ValidationError as e:
        raise GeminiError(f"Gemini output failed schema validation: {e}") from e
