import logging

from fastapi import APIRouter, HTTPException, Response

from schemas import FeedbackRequest
from services import feedback, sessions

router = APIRouter()
log = logging.getLogger(__name__)


@router.post("/api/feedback", status_code=204, response_class=Response)
async def post_feedback(req: FeedbackRequest) -> None:
    session = await sessions.get_session_store().get(req.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="session not found")
    # Same rule as narrate: only lineup objects are narrated, so only they can be rated
    if req.pick_id not in session["lineup"]:
        raise HTTPException(status_code=400, detail=f"pick_id {req.pick_id} is not in lineup")
    pick = next(o for o in session["objects"] if o["id"] == req.pick_id)
    await feedback.get_feedback_store().save(
        req.session_id,
        req.pick_id,
        # Copy the pick so feedback can be read without joining sessions (D-13)
        {**req.model_dump(), "pick_name": pick["name"], "pick_detail": pick["detail"]},
    )
    log.info(
        "feedback saved",
        extra={
            "fields": {
                "session_id": req.session_id,
                "pick_id": req.pick_id,
                "rating": req.rating,
                "has_comment": bool(req.comment),
            }
        },
    )
