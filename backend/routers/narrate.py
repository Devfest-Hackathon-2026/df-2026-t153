import logging
from collections.abc import AsyncIterator

from fastapi import APIRouter
from fastapi.sse import EventSourceResponse, ServerSentEvent

from prompts.narration import build_narration_prompt
from schemas import InventoryObject, InventoryText, NarrateDone, NarrateError, NarrateMeta
from services import gemini, sessions, storage

router = APIRouter()
log = logging.getLogger(__name__)


def _error(session_id: str, status: int, detail: str) -> ServerSentEvent:
    log.error(
        "narration failed",
        extra={"fields": {"session_id": session_id, "status": status, "error": detail}},
    )
    return ServerSentEvent(event="error", data=NarrateError(status=status, detail=detail))


@router.get("/api/narrate", response_class=EventSourceResponse)
async def narrate(session_id: str, pick_id: str) -> AsyncIterator[ServerSentEvent]:
    # Headers are already sent once streaming starts, so every failure is an `error` event
    session = await sessions.get_session_store().get(session_id)
    if session is None:
        yield _error(session_id, 404, "session not found")
        return
    # Rule 7: only objects that passed the lineup filter may be narrated
    if pick_id not in session["lineup"]:
        yield _error(session_id, 400, f"pick_id {pick_id} is not in lineup")
        return
    pick = next(InventoryObject.model_validate(o) for o in session["objects"] if o["id"] == pick_id)
    try:
        jpeg = await storage.load_photo(session["photo_uri"])
    except Exception as e:
        log.exception("photo load failed", extra={"fields": {"session_id": session_id}})
        yield _error(session_id, 500, f"photo load failed: {e}")
        return

    yield ServerSentEvent(
        event="meta", data=NarrateMeta(pick_id=pick.id, name=pick.name, box=pick.box)
    )
    prompt = build_narration_prompt(
        session["scene"],
        pick,
        [InventoryText.model_validate(t) for t in session["texts"]],
        session.get("gps"),
    )
    try:
        async for item in gemini.stream_narration(jpeg, prompt):
            if isinstance(item, NarrateDone):
                yield ServerSentEvent(event="done", data=item)
            else:
                yield ServerSentEvent(event="delta", data=item)
    except gemini.GeminiError as e:
        status = 503 if isinstance(e, gemini.GeminiUnavailableError) else 502
        yield _error(session_id, status, str(e))
