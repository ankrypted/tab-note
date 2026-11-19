"""Generates the toolbar icons (teal rounded square with a white note line)
using only the standard library. Run: npm run icons"""
import struct
import zlib
from pathlib import Path

TEAL = (15, 118, 110, 255)
WHITE = (255, 255, 255, 255)
CLEAR = (0, 0, 0, 0)


def inside_round_rect(x, y, size, r):
    cx = min(max(x, r), size - 1 - r)
    cy = min(max(y, r), size - 1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def pixel(x, y, size):
    if not inside_round_rect(x, y, size, size * 0.22):
        return CLEAR
    # Three "text lines", the last one shorter.
    left, right = size * 0.24, size * 0.76
    thick = max(1, round(size * 0.09))
    for i, frac in enumerate((0.30, 0.50, 0.70)):
        top = round(size * frac) - thick // 2
        end = right if i < 2 else size * 0.55
        if top <= y < top + thick and left <= x <= end:
            return WHITE
    return TEAL


def png(size):
    raw = b""
    for y in range(size):
        raw += b"\x00" + b"".join(bytes(pixel(x, y, size)) for x in range(size))

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header)
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


if __name__ == "__main__":
    out = Path(__file__).resolve().parent.parent / "src" / "icons"
    out.mkdir(parents=True, exist_ok=True)
    for s in (16, 32, 48, 128):
        (out / f"icon{s}.png").write_bytes(png(s))
        print("wrote", out / f"icon{s}.png")
