import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile

from schemas import AnalyzeResponse
from services import gemini, image, lineup, sessions, storage

router = APIRouter()
log = logging.getLogger(__name__)


@router.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze(image_file: Annotated[UploadFile, File(alias="image")]) -> AnalyzeResponse:
    try:
        prepared = image.prepare(await image_file.read())
    except image.ImageDecodeError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    session_id = uuid.uuid4().hex
    try:
        inv = await gemini.list_inventory(prepared.jpeg)
    except gemini.GeminiError as e:
        status = 503 if isinstance(e, gemini.GeminiUnavailableError) else 502
        log.error(
            "inventory failed",
            extra={"fields": {"session_id": session_id, "status": status, "error": str(e)}},
        )
        raise HTTPException(status_code=status, detail=str(e)) from e

    ids = lineup.build_lineup(inv.objects)
    photo_uri = await storage.save_photo(session_id, prepared.jpeg)
    gps = {"lat": prepared.gps[0], "lon": prepared.gps[1]} if prepared.gps else None
    await sessions.get_session_store().save(
        session_id,
        {**inv.model_dump(), "lineup": ids, "photo_uri": photo_uri, "gps": gps},
    )
    log.info(
        "analyzed",
        extra={
            "fields": {
                "session_id": session_id,
                "objects": len(inv.objects),
                "lineup": len(ids),
                "has_gps": gps is not None,
            }
        },
    )
    return AnalyzeResponse(session_id=session_id, lineup=ids, **inv.model_dump())
