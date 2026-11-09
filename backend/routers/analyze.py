import asyncio
import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile

from schemas import AnalyzeResponse
from services import gemini, geocode, image, lineup, sessions, storage

router = APIRouter()
log = logging.getLogger(__name__)

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
# 2 decimals is about 1 km: enough for the narration's sense of place, not a home address
GPS_DECIMALS = 2


async def _place(gps: tuple[float, float] | None) -> str | None:
    return await geocode.town_name(*gps) if gps else None


@router.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze(image_file: Annotated[UploadFile, File(alias="image")]) -> AnalyzeResponse:
    data = await image_file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        log.warning("upload too large", extra={"fields": {"limit_bytes": MAX_UPLOAD_BYTES}})
        raise HTTPException(status_code=413, detail="image too large")
    try:
        prepared = image.prepare(data)
    except image.ImageDecodeError as e:
        log.warning("image decode failed", extra={"fields": {"error": str(e)}})
        raise HTTPException(status_code=400, detail="image decode failed") from e

    session_id = uuid.uuid4().hex
    try:
        # The town lookup (~2 s) runs alongside the inventory call (~10 s), so it adds no wait.
        # It gets the unrounded point so the town is right; only the town name is stored (D-37)
        inv, place = await asyncio.gather(
            gemini.list_inventory(prepared.jpeg), _place(prepared.gps)
        )
    except gemini.GeminiError as e:
        status = 503 if isinstance(e, gemini.GeminiUnavailableError) else 502
        log.error(
            "inventory failed",
            extra={"fields": {"session_id": session_id, "status": status, "error": str(e)}},
        )
        # The raw error carries model names and model output; it stays in the log only
        detail = "upstream unavailable" if status == 503 else "analysis failed"
        raise HTTPException(status_code=status, detail=detail) from e

    ids = lineup.build_lineup(inv.objects)
    photo_uri = await storage.save_photo(session_id, prepared.jpeg)
    gps = (
        {"lat": round(prepared.gps[0], GPS_DECIMALS), "lon": round(prepared.gps[1], GPS_DECIMALS)}
        if prepared.gps
        else None
    )
    await sessions.get_session_store().save(
        session_id,
        {**inv.model_dump(), "lineup": ids, "photo_uri": photo_uri, "gps": gps, "place": place},
    )
    log.info(
        "analyzed",
        extra={
            "fields": {
                "session_id": session_id,
                "objects": len(inv.objects),
                "lineup": len(ids),
                "has_gps": gps is not None,
                "has_place": place is not None,
            }
        },
    )
    return AnalyzeResponse(session_id=session_id, lineup=ids, **inv.model_dump())
