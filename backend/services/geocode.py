import logging
import re

import httpx2

log = logging.getLogger(__name__)

# D-36: GSI's reverse geocoder needs no API key and returns the town name for a point in Japan
GSI_REVERSE_URL = "https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress"
TIMEOUT = 3.0
# A 丁目 narrows the place to a few hundred metres; the town alone keeps D-34's ~1 km grain
_CHOME = re.compile(r"[一二三四五六七八九十]+丁目$")


async def town_name(lat: float, lon: float) -> str | None:
    """座標の町名（丁目は落とす。例: 丸の内）。取れなければ None（場所が無くても語れる）。"""
    try:
        async with httpx2.AsyncClient(timeout=TIMEOUT) as client:
            res = await client.get(GSI_REVERSE_URL, params={"lat": lat, "lon": lon})
            res.raise_for_status()
            body = res.json()
    except (httpx2.HTTPError, ValueError) as e:
        log.warning("reverse geocode failed", extra={"fields": {"error": type(e).__name__}})
        return None
    # Points at sea or outside Japan come back as {}
    name = (body.get("results") or {}).get("lv01Nm") if isinstance(body, dict) else None
    if not isinstance(name, str):
        return None
    town = _CHOME.sub("", name.strip())
    return town if town and town not in ("－", "-") else None
