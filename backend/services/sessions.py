from functools import lru_cache
from typing import Any, Protocol

from google.cloud import firestore

from config import get_settings

COLLECTION = "sessions"


class SessionStore(Protocol):
    async def save(self, session_id: str, data: dict[str, Any]) -> None: ...
    async def get(self, session_id: str) -> dict[str, Any] | None: ...


class FirestoreSessionStore:
    def __init__(self) -> None:
        self._db = firestore.AsyncClient(project=get_settings().gcp_project or None)

    async def save(self, session_id: str, data: dict[str, Any]) -> None:
        await (
            self._db.collection(COLLECTION)
            .document(session_id)
            .set({**data, "created_at": firestore.SERVER_TIMESTAMP})
        )

    async def get(self, session_id: str) -> dict[str, Any] | None:
        snap = await self._db.collection(COLLECTION).document(session_id).get()
        return snap.to_dict() if snap.exists else None


class MemorySessionStore:
    def __init__(self) -> None:
        self._data: dict[str, dict[str, Any]] = {}

    async def save(self, session_id: str, data: dict[str, Any]) -> None:
        self._data[session_id] = data

    async def get(self, session_id: str) -> dict[str, Any] | None:
        return self._data.get(session_id)


@lru_cache
def get_session_store() -> SessionStore:
    if get_settings().firestore_disabled:
        return MemorySessionStore()
    return FirestoreSessionStore()
