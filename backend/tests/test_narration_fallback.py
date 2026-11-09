"""D-32 / D-41: no text in time with grounding -> narration retries without it."""

import asyncio
from collections.abc import AsyncIterator
from types import SimpleNamespace
from typing import Any

import pytest

from schemas import NarrateDone
from services import gemini


def _chunk(text: str | None) -> Any:
    # Only the attributes stream_narration reads
    return SimpleNamespace(text=text, candidates=[])


def test_falls_back_when_only_empty_chunks_arrive_in_time(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[bool] = []

    async def slow_text() -> AsyncIterator[Any]:
        yield _chunk(None)  # a chunk arrives at once, but without any text
        await asyncio.sleep(5)  # the text never comes within the 0.1s budget
        yield _chunk("遅い本文。")

    async def plain() -> AsyncIterator[Any]:
        yield _chunk(None)
        yield _chunk("手前の蓋は縁が高い。")
        yield _chunk("奥のは低い。")

    class Models:
        async def generate_content_stream(self, *, model: str, contents: Any, config: Any) -> Any:
            grounded = config.tools is not None
            calls.append(grounded)
            return slow_text() if grounded else plain()

    monkeypatch.setattr(
        gemini, "_client", lambda: SimpleNamespace(aio=SimpleNamespace(models=Models()))
    )

    async def collect() -> list[str | NarrateDone]:
        return [
            i async for i in gemini.stream_narration(b"jpeg", "prompt", first_token_timeout=0.1)
        ]

    # Plain asyncio.run keeps the test free of an async pytest plugin
    items = asyncio.run(collect())

    assert calls == [True, False]
    assert items[:-1] == ["手前の蓋は縁が高い。", "奥のは低い。"]
    done = items[-1]
    assert isinstance(done, NarrateDone)
    assert done.sources == [] and done.search_entry_html is None
