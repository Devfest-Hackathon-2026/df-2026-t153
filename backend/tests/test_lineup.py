from schemas import InventoryObject
from services.lineup import build_lineup, normalize_name


def _o(id: str, **over: object) -> InventoryObject:
    base: dict[str, object] = {
        "id": id,
        # Distinct names by default: same-name objects are merged on purpose (D-31)
        "name": id,
        "salience": 3,
        "detail": "d",
        "sure": True,
        "kind": "fixture",
        "box": [0, 0, 10, 10],
        "whole": True,
        "potential": 3,
    }
    return InventoryObject.model_validate({**base, **over})


def test_excludes_ineligible() -> None:
    objs = [
        _o("ok"),
        _o("unsure", sure=False),
        _o("car", kind="transient"),
        _o("man", kind="person"),
        _o("cut", whole=False),
        _o("small", salience=2),
    ]
    assert build_lineup(objs) == ["ok"]


def test_orders_by_potential_then_salience_and_caps_at_three() -> None:
    objs = [
        _o("a", potential=3, salience=5),
        _o("b", potential=5, salience=3),
        _o("c", potential=5, salience=4),
        _o("d", potential=4, salience=3),
        _o("e", potential=1, salience=5),
    ]
    assert build_lineup(objs) == ["c", "b", "d"]


def test_falls_back_to_cut_objects_only_when_nothing_is_whole() -> None:
    objs = [
        _o("cut", whole=False, potential=4),
        _o("cut_small", whole=False, salience=2),
        _o("cut_car", whole=False, kind="transient"),
    ]
    assert build_lineup(objs) == ["cut"]
    assert build_lineup([*objs, _o("ok", potential=1)]) == ["ok"]


def test_empty_when_nothing_eligible() -> None:
    assert build_lineup([_o("x", kind="transient")]) == []


def test_normalize_name_ignores_wording_only_differences() -> None:
    assert normalize_name("マンホールの蓋") == normalize_name("マンホール 蓋") == "マンホール"
    assert normalize_name("側溝の蓋") == normalize_name("側溝")
    # Short words keep their suffix so unrelated things do not merge
    assert normalize_name("看板") == "看板"
    assert normalize_name("表札") != normalize_name("表示板")


def test_merges_same_name_keeping_the_stronger_one() -> None:
    objs = [
        _o("m_low", name="マンホール", potential=3),
        _o("m_high", name="マンホールの蓋", potential=5),
        _o("m_mid", name="マンホール 蓋", potential=4),
        _o("post", name="郵便ポスト", potential=4),
        _o("wall", name="石垣", potential=2),
    ]
    assert build_lineup(objs) == ["m_high", "post", "wall"]
