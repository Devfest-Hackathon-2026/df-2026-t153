import re

from schemas import InventoryObject

LINEUP_SIZE = 3
MIN_SALIENCE = 3
# Suffixes that only vary the wording ("マンホール" / "マンホールの蓋"), not the thing
_LOOSE_SUFFIXES = ("蓋", "ふた", "板")


def normalize_name(name: str) -> str:
    """同じ物の言い換えを揃える: 空白、「の」、末尾の「蓋/板」の有無。"""
    s = re.sub(r"\s+", "", name).replace("の", "")
    for suffix in _LOOSE_SUFFIXES:
        # Keep at least two characters so 「看板」 does not collapse to 「看」
        if s.endswith(suffix) and len(s) - len(suffix) >= 2:
            s = s[: -len(suffix)]
            break
    return s


def dedupe_by_name(objects: list[InventoryObject]) -> list[InventoryObject]:
    """既に強い順に並んだ候補から、同名の2つ目以降を落とす。"""
    seen: set[str] = set()
    kept: list[InventoryObject] = []
    for o in objects:
        key = normalize_name(o.name)
        if key in seen:
            continue
        seen.add(key)
        kept.append(o)
    return kept


def eligible(o: InventoryObject, require_whole: bool = True) -> bool:
    return (
        o.sure
        and o.kind == "fixture"
        and (o.whole or not require_whole)
        and o.salience >= MIN_SALIENCE
    )


def build_lineup(objects: list[InventoryObject]) -> list[str]:
    """抽選台帳: 条件を満たす物を (potential, salience) 降順で上位 LINEUP_SIZE 件。"""
    picked = [o for o in objects if eligible(o)]
    if not picked:
        # D-11: street scenes often have every fixture cut by the frame edge; an empty
        # lineup leaves nothing to narrate, so drop only the whole-in-frame requirement
        picked = [o for o in objects if eligible(o, require_whole=False)]
    picked.sort(key=lambda o: (o.potential, o.salience), reverse=True)
    # Two manhole covers in one photo are one story; keep the stronger one (D-31)
    return [o.id for o in dedupe_by_name(picked)[:LINEUP_SIZE]]
