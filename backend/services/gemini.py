import asyncio
import logging
import time
from collections.abc import AsyncIterator, Awaitable, Callable
from functools import lru_cache

import httpx2
from google import genai
from google.genai import errors, types
from pydantic import ValidationError

from config import get_settings
from prompts.inventory import INVENTORY_PROMPT
from schemas import Inventory, NarrateDone, NarrateSource

log = logging.getLogger(__name__)

# D-03: LOW was ~3x faster than the default MEDIUM with no loss in coverage on sample.jpg
THINKING_LEVEL = types.ThinkingLevel.LOW
# D-05: retry only transient quota/availability errors; delays before retry 1 and 2
RETRY_STATUS = (429, 503)
RETRY_DELAYS = (1.0, 3.0)
# D-32: after giving up on grounding, the plain call gets this long for its first token
FALLBACK_FIRST_TOKEN_TIMEOUT = 30.0
# D-33: Gemini can hang with no error; analyze retries once after this many seconds
ANALYZE_TIMEOUT = 40.0
# Deltas are already sent by the time the stream stalls, so this is not retried
NARRATE_IDLE_TIMEOUT = 25.0


class GeminiError(RuntimeError):
    """Gemini 呼び出しまたは出力パースの失敗。ルーターで 502 にする。"""


class GeminiUnavailableError(GeminiError):
    """429/503 が再試行後も続いた、または通信が切れた。ルーターで 503 にする。"""


def _connection_error(e: httpx2.TransportError) -> GeminiUnavailableError:
    # genai raises httpx2 errors as-is on dropped connections and timeouts, not APIError
    log.error("gemini connection failed", extra={"fields": {"error": type(e).__name__}})
    return GeminiUnavailableError(f"Gemini connection failed ({type(e).__name__}): {e}")


@lru_cache
def _client() -> genai.Client:
    s = get_settings()
    return genai.Client(vertexai=True, project=s.gcp_project, location=s.gcp_location)


async def _with_retry[T](call: Callable[[], Awaitable[T]]) -> tuple[T, int]:
    for attempt in range(len(RETRY_DELAYS) + 1):
        try:
            return await call(), attempt
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
        except httpx2.TransportError as e:
            raise _connection_error(e) from e
    raise AssertionError("unreachable")


def _photo_and_text(jpeg: bytes, text: str) -> types.Content:
    return types.Content(
        role="user",
        parts=[
            types.Part.from_bytes(data=jpeg, mime_type="image/jpeg"),
            types.Part.from_text(text=text),
        ],
    )


async def _generate_inventory(jpeg: bytes) -> tuple[types.GenerateContentResponse, int]:
    for attempt in range(2):
        try:
            res, retries = await asyncio.wait_for(
                _with_retry(
                    lambda: _client().aio.models.generate_content(
                        model=get_settings().gemini_flash_model,
                        contents=_photo_and_text(jpeg, INVENTORY_PROMPT),
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            response_schema=Inventory,
                            thinking_config=types.ThinkingConfig(thinking_level=THINKING_LEVEL),
                        ),
                    )
                ),
                ANALYZE_TIMEOUT,
            )
            return res, retries + attempt
        except TimeoutError as e:
            log.warning(
                "gemini inventory timeout",
                extra={"fields": {"timeout_s": ANALYZE_TIMEOUT, "attempt": attempt + 1}},
            )
            if attempt == 1:
                raise GeminiUnavailableError(
                    f"Gemini did not respond within {ANALYZE_TIMEOUT:.0f}s (after 1 retry)"
                ) from e
    raise AssertionError("unreachable")


async def list_inventory(jpeg: bytes) -> Inventory:
    t0 = time.perf_counter()
    res, retries = await _generate_inventory(jpeg)
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


type _Chunk = types.GenerateContentResponse
# The chunks read so far (the last one carries the first text) and the rest of the stream
type _Opened = tuple[list[_Chunk], AsyncIterator[_Chunk]]


async def _open_stream(jpeg: bytes, prompt: str, grounding: bool) -> _Opened:
    stream = await _client().aio.models.generate_content_stream(
        model=get_settings().gemini_flash_model,
        contents=_photo_and_text(jpeg, prompt),
        config=types.GenerateContentConfig(
            tools=[types.Tool(google_search=types.GoogleSearch())] if grounding else None,
            thinking_config=types.ThinkingConfig(thinking_level=THINKING_LEVEL),
        ),
    )
    # D-40: read up to the first chunk that has text, so 429/503 raised on the first reads are
    # retried too and the caller's wait_for covers chunks without text (thoughts, grounding
    # metadata only). Those chunks are kept: sources and search suggestions can ride on them.
    prelude: list[_Chunk] = []
    while True:
        try:
            res = await anext(stream)
        except StopAsyncIteration as e:
            raise GeminiError("Gemini returned a stream with no text") from e
        prelude.append(res)
        if res.text:
            return prelude, stream


async def _open_with_fallback(
    jpeg: bytes, prompt: str, fallback_prompt: str, first_token_timeout: float
) -> tuple[_Opened, int, bool]:
    """grounding ありで開き、本文の最初の文字が間に合わなければ grounding なしで開き直す。

    Returns (stream, retries, grounded). wait_for cancels the slow call, which closes
    its HTTP stream; the plain call then gets FALLBACK_FIRST_TOKEN_TIMEOUT.
    """
    t0 = time.perf_counter()
    try:
        opened, retries = await _with_retry(
            lambda: asyncio.wait_for(_open_stream(jpeg, prompt, True), first_token_timeout)
        )
        return opened, retries, True
    except TimeoutError:
        waited_ms = round((time.perf_counter() - t0) * 1000)
    log.warning(
        "narration fallback",
        extra={"fields": {"fallback": "no_grounding", "waited_ms": waited_ms}},
    )
    try:
        opened, retries = await _with_retry(
            lambda: asyncio.wait_for(
                _open_stream(jpeg, fallback_prompt, False), FALLBACK_FIRST_TOKEN_TIMEOUT
            )
        )
    except TimeoutError as e:
        raise GeminiUnavailableError(
            f"narration produced no text within {FALLBACK_FIRST_TOKEN_TIMEOUT:.0f}s "
            "even without grounding"
        ) from e
    return opened, retries, False


async def stream_narration(
    jpeg: bytes,
    prompt: str,
    first_token_timeout: float | None = None,
    fallback_prompt: str | None = None,
) -> AsyncIterator[str | NarrateDone]:
    """語りの断片（str）を順に返し、最後に NarrateDone を1つ返す。

    fallback_prompt は grounding なしに切り替えたときに使う（省略時は prompt のまま）。"""
    t0 = time.perf_counter()
    if first_token_timeout is None:
        first_token_timeout = get_settings().narrate_first_token_timeout
    (prelude, stream), retries, grounded = await _open_with_fallback(
        jpeg, prompt, fallback_prompt or prompt, first_token_timeout
    )
    sources: dict[str, NarrateSource] = {}
    queries: list[str] = []
    entry_html: str | None = None
    finish_reason: object = None

    async def chunks() -> AsyncIterator[_Chunk]:
        for res in prelude:
            yield res
        try:
            while True:
                try:
                    yield await asyncio.wait_for(anext(stream), NARRATE_IDLE_TIMEOUT)
                except StopAsyncIteration:
                    return
        except TimeoutError as e:
            log.error("gemini stream stalled", extra={"fields": {"idle_s": NARRATE_IDLE_TIMEOUT}})
            raise GeminiUnavailableError(
                f"Gemini stream stalled for {NARRATE_IDLE_TIMEOUT:.0f}s mid-narration"
            ) from e
        except errors.APIError as e:
            raise GeminiError(f"Gemini API error {e.code} mid-stream: {e.message}") from e
        except httpx2.TransportError as e:
            raise _connection_error(e) from e

    async for res in chunks():
        if res.text:
            yield res.text
        cand = res.candidates[0] if res.candidates else None
        if cand is None:
            continue
        finish_reason = cand.finish_reason or finish_reason
        meta = cand.grounding_metadata
        if meta is None:
            continue
        for chunk in meta.grounding_chunks or []:
            if chunk.web and chunk.web.uri:
                title = chunk.web.title or chunk.web.domain or chunk.web.uri
                sources[chunk.web.uri] = NarrateSource(title=title, uri=chunk.web.uri)
        queries += meta.web_search_queries or []
        if meta.search_entry_point and meta.search_entry_point.rendered_content:
            entry_html = meta.search_entry_point.rendered_content

    log.info(
        "gemini narration",
        extra={
            "fields": {
                "model": get_settings().gemini_flash_model,
                "retries": retries,
                "grounding": grounded,
                "prelude_chunks": len(prelude),
                "elapsed_ms": round((time.perf_counter() - t0) * 1000),
                "finish_reason": str(finish_reason),
                "sources": len(sources),
                "search_queries": queries,
            }
        },
    )
    yield NarrateDone(sources=list(sources.values()), search_entry_html=entry_html)
