from schemas import InventoryObject

LINEUP_SIZE = 3
MIN_SALIENCE = 3


def eligible(o: InventoryObject) -> bool:
    return o.sure and o.kind == "fixture" and o.whole and o.salience >= MIN_SALIENCE


def build_lineup(objects: list[InventoryObject]) -> list[str]:
    """抽選台帳: 条件を満たす物を (potential, salience) 降順で上位 LINEUP_SIZE 件。"""
    picked = sorted(
        filter(eligible, objects), key=lambda o: (o.potential, o.salience), reverse=True
    )
    return [o.id for o in picked[:LINEUP_SIZE]]
