import json

import pytest
from pydantic import ValidationError

from schemas import Inventory


def _obj(**over: object) -> dict[str, object]:
    base: dict[str, object] = {
        "id": "o1",
        "name": "消火栓",
        "salience": 4,
        "detail": "画面右下、赤い鉄製",
        "sure": True,
        "kind": "fixture",
        "box": [600, 700, 800, 950],
        "whole": True,
        "potential": 3,
    }
    return {**base, **over}


def _inv(*objects: dict[str, object]) -> str:
    return json.dumps(
        {"scene": "路地", "objects": list(objects), "texts": [{"content": "止まれ", "where": "左"}]}
    )


def test_parses_valid_output() -> None:
    inv = Inventory.model_validate_json(_inv(_obj()))
    assert inv.objects[0].kind == "fixture"
    assert inv.texts[0].content == "止まれ"


def test_box_corners_are_sorted() -> None:
    inv = Inventory.model_validate_json(_inv(_obj(box=[800, 950, 600, 700])))
    assert inv.objects[0].box == [600, 700, 800, 950]


@pytest.mark.parametrize(
    "bad",
    [
        {"salience": 0},
        {"potential": 6},
        {"kind": "shadow"},
        {"box": [1, 2, 3]},
        {"sure": "maybe"},
    ],
)
def test_rejects_invalid_object(bad: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        Inventory.model_validate_json(_inv(_obj(**bad)))


def test_rejects_duplicate_ids() -> None:
    with pytest.raises(ValidationError):
        Inventory.model_validate_json(_inv(_obj(), _obj()))


def test_texts_are_completed_from_detail() -> None:
    raw = json.dumps(
        {
            "scene": "路地",
            "objects": [
                _obj(id="o1", name="暖簾", detail="中央、「蔵」「しょうゆ」と白字の暖簾"),
                _obj(id="o2", name="表札", detail="右の石柱の表面にみそ醤油蔵と書かれた白い札"),
                _obj(id="o3", name="看板", detail='左手前、"OPEN"と読める札'),
                _obj(id="o4", name="塀", detail="画面右、文字はない"),
            ],
            "texts": [{"content": "蔵", "where": "中央の暖簾"}],
        }
    )
    texts = [(t.content, t.where) for t in Inventory.model_validate_json(raw).texts]
    assert texts == [
        ("蔵", "中央の暖簾"),
        ("しょうゆ", "暖簾"),
        ("みそ醤油蔵", "表札"),
        ("OPEN", "看板"),
    ]
