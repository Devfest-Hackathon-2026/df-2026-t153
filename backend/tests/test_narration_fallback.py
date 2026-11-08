"""D-32: when grounding yields no first token in time, narration retries without it."""

import asyncio
from collections.abc import AsyncIterator
from types import SimpleNamespace
from typing import Any

import pytest

from prompts.narration import TAKEAWAY_HEADING
from schemas import NarrateDone
from services import gemini


def _chunk(text: str) -> Any:
    # Only the attributes stream_narration reads
    return SimpleNamespace(text=text, candidates=[])


async def _rest() -> AsyncIterator[Any]:
    yield _chunk(f"\n{TAKEAWAY_HEADING}\n")
    yield _chunk("次の散歩では端を見る。")


def test_falls_back_to_no_grounding_when_first_token_is_slow(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[bool] = []

    async def fake_open(jpeg: bytes, prompt: str, grounding: bool) -> Any:
        calls.append(grounding)
        if grounding:
            await asyncio.sleep(5)  # never returns within the 0.1s budget
        return _chunk("手前の蓋は縁が高い。"), _rest()

    monkeypatch.setattr(gemini, "_open_stream", fake_open)

    async def collect() -> list[str | NarrateDone]:
        return [
            i async for i in gemini.stream_narration(b"jpeg", "prompt", first_token_timeout=0.1)
        ]

    # Plain asyncio.run keeps the test free of an async pytest plugin
    items = asyncio.run(collect())

    assert calls == [True, False]
    assert items[0] == "手前の蓋は縁が高い。"
    done = items[-1]
    assert isinstance(done, NarrateDone)
    assert done.takeaway == "次の散歩では端を見る。"
    assert done.sources == [] and done.search_entry_html is None
