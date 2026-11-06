import io
from dataclasses import dataclass

import pillow_heif
from PIL import Image, ImageOps, UnidentifiedImageError

pillow_heif.register_heif_opener()

MAX_EDGE = 1568
_GPS_IFD = 0x8825


class ImageDecodeError(ValueError):
    pass


@dataclass(frozen=True)
class PreparedImage:
    jpeg: bytes
    width: int
    height: int
    gps: tuple[float, float] | None


def _dms_to_deg(dms: tuple[float, float, float], ref: str) -> float:
    deg = float(dms[0]) + float(dms[1]) / 60 + float(dms[2]) / 3600
    return -deg if ref in ("S", "W") else deg


def _read_gps(img: Image.Image) -> tuple[float, float] | None:
    gps = img.getexif().get_ifd(_GPS_IFD)
    lat, lat_ref, lon, lon_ref = gps.get(2), gps.get(1), gps.get(4), gps.get(3)
    if not (lat and lat_ref and lon and lon_ref):
        return None
    return _dms_to_deg(lat, lat_ref), _dms_to_deg(lon, lon_ref)


def prepare(data: bytes) -> PreparedImage:
    """HEIC/JPEG 等を読み、向きを正して最大辺 MAX_EDGE の JPEG にする。"""
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except (UnidentifiedImageError, OSError) as e:
        raise ImageDecodeError(f"画像として読めません: {e}") from e

    gps = _read_gps(img)
    rgb = ImageOps.exif_transpose(img).convert("RGB")
    rgb.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)

    buf = io.BytesIO()
    # Re-encoding drops EXIF, so the stored photo carries no GPS
    rgb.save(buf, format="JPEG", quality=88)
    return PreparedImage(jpeg=buf.getvalue(), width=rgb.width, height=rgb.height, gps=gps)
