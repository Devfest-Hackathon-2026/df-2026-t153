import re
from typing import Literal, Self

from pydantic import BaseModel, Field, model_validator

Kind = Literal["fixture", "transient", "person"]

_QUOTED = re.compile(r'「([^「」]+)」|"([^"]+)"|“([^”]+)”')
_WRITTEN = re.compile(r'([^\s、。，．,.:：・「」"“”()（）]+)と(?:書かれ|読め)')
_PARTICLE_SPLIT = re.compile(r"(?<=[にはでがを])")


def texts_in_detail(detail: str) -> list[str]:
    """detail 中で「読める文字」として言及された文字列を取り出す。"""
    found = [next(g for g in m.groups() if g) for m in _QUOTED.finditer(detail)]
    for m in _WRITTEN.finditer(detail):
        # "表面にみそ醤油蔵と書かれた" -> drop the leading "表面に"
        found.append(_PARTICLE_SPLIT.split(m.group(1))[-1])
    return [s.strip() for s in found if s.strip()]


class InventoryObject(BaseModel):
    id: str
    name: str
    salience: int = Field(ge=1, le=5)
    detail: str
    sure: bool
    kind: Kind
    box: list[int] = Field(min_length=4, max_length=4)
    whole: bool
    potential: int = Field(ge=1, le=5)

    @model_validator(mode="after")
    def _sort_box(self) -> Self:
        # The model occasionally swaps corners; downstream cropping assumes x1<x2, y1<y2
        x1, y1, x2, y2 = self.box
        self.box = [min(x1, x2), min(y1, y2), max(x1, x2), max(y1, y2)]
        return self


class InventoryText(BaseModel):
    content: str
    where: str


class Inventory(BaseModel):
    """Gemini の列挙出力。response_schema にもこのモデルを渡す。"""

    scene: str
    objects: list[InventoryObject]
    texts: list[InventoryText]

    @model_validator(mode="after")
    def _unique_ids(self) -> Self:
        ids = [o.id for o in self.objects]
        if len(ids) != len(set(ids)):
            raise ValueError("objects[].id is not unique")
        return self

    @model_validator(mode="after")
    def _complete_texts(self) -> Self:
        # D-04: the model mentions readable text in detail but often omits it from texts;
        # texts drives the no-signboard rule, so a miss here leaks into the narration
        seen = {t.content.strip() for t in self.texts}
        for o in self.objects:
            for s in texts_in_detail(o.detail):
                if s not in seen:
                    seen.add(s)
                    self.texts.append(InventoryText(content=s, where=o.name))
        return self


class AnalyzeResponse(BaseModel):
    session_id: str
    scene: str
    objects: list[InventoryObject]
    texts: list[InventoryText]
    lineup: list[str] = Field(description="抽選候補の objects[].id（最大3件）")


class NarrateMeta(BaseModel):
    """SSE `meta`: 語りの対象。"""

    pick_id: str
    name: str
    box: list[int] = Field(min_length=4, max_length=4)
    # Place name for the photo's location; None until the session carries a resolved name
    place: str | None = None


class NarrateSource(BaseModel):
    title: str
    uri: str


class NarrateDone(BaseModel):
    """SSE `done`: 語りの末尾。出典と、Google 検索候補の表示用 HTML。"""

    sources: list[NarrateSource] = Field(description="Search grounding の出典")
    search_entry_html: str | None = Field(
        default=None, description="Google 検索候補の表示用 HTML（grounding 利用時に表示する）"
    )


class NarrateError(BaseModel):
    """SSE `error`。status は HTTP ステータス相当。"""

    status: int
    detail: str


Rating = Literal["boring", "fishy", "great"]


class FeedbackRequest(BaseModel):
    """POST /api/feedback の本文。同じ session_id と pick_id への再送は上書き。"""

    session_id: str = Field(min_length=1)
    pick_id: str = Field(min_length=1)
    rating: Rating
    comment: str = Field(default="", max_length=500)
