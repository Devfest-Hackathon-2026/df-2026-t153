from functools import lru_cache
from typing import Any, Protocol

from google.cloud import firestore

from config import get_settings

COLLECTION = "feedback"


def doc_id(session_id: str, pick_id: str) -> str:
    # One document per (session, pick) so a resend overwrites instead of adding a vote
    return f"{session_id}_{pick_id}"


class FeedbackStore(Protocol):
    async def save(self, session_id: str, pick_id: str, data: dict[str, Any]) -> None: ...


class FirestoreFeedbackStore:
    def __init__(self) -> None:
        self._db = firestore.AsyncClient(project=get_settings().gcp_project or None)

    async def save(self, session_id: str, pick_id: str, data: dict[str, Any]) -> None:
        await (
            self._db.collection(COLLECTION)
            .document(doc_id(session_id, pick_id))
            .set({**data, "created_at": firestore.SERVER_TIMESTAMP})
        )


class MemoryFeedbackStore:
    def __init__(self) -> None:
        self.data: dict[str, dict[str, Any]] = {}

    async def save(self, session_id: str, pick_id: str, data: dict[str, Any]) -> None:
        self.data[doc_id(session_id, pick_id)] = data


@lru_cache
def get_feedback_store() -> FeedbackStore:
    if get_settings().firestore_disabled:
        return MemoryFeedbackStore()
    return FirestoreFeedbackStore()
