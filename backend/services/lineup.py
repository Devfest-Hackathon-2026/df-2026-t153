from schemas import InventoryObject

LINEUP_SIZE = 3
MIN_SALIENCE = 3


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
    return [o.id for o in picked[:LINEUP_SIZE]]
