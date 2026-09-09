#!/usr/bin/env python3
"""Publish one sourced article through Antoine Quarroz's restricted Hermes API."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import math
import os
import struct
import time
import urllib.error
import urllib.parse
import urllib.request
import zlib
from pathlib import Path


SITE = "https://www.antoinequarroz.ch"
ENDPOINT = f"{SITE}/api/hermes/articles"


def _chunk(kind: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)


def branded_cover(seed: str, width: int = 1200, height: int = 630) -> str:
    """Create a deterministic dark/turquoise abstract PNG without dependencies."""
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    phase = digest[0] / 255 * math.tau
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        for x in range(width):
            nx, ny = x / width, y / height
            wave = math.sin(nx * 8.2 + phase) * 0.055 + math.sin(nx * 17.0 - phase) * 0.018
            glow = max(0.0, 1.0 - math.hypot(nx - 0.72, ny - (0.48 + wave)) * 2.2)
            ribbon = max(0.0, 1.0 - abs(ny - (0.62 + wave)) * 12.0)
            accent = max(0.0, 1.0 - math.hypot(nx - 0.18, ny - 0.24) * 5.2)
            grain = ((x * 17 + y * 31 + digest[(x + y) % len(digest)]) % 13) / 255
            raw.extend((
                min(255, int(9 + 9 * glow + 218 * accent + grain * 10)),
                min(255, int(18 + 132 * glow + 155 * ribbon + 72 * accent + grain * 10)),
                min(255, int(31 + 128 * glow + 134 * ribbon + 25 * accent + grain * 12)),
            ))
    png = b"\x89PNG\r\n\x1a\n"
    png += _chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
    png += _chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += _chunk(b"IEND", b"")
    return "data:image/png;base64," + base64.b64encode(png).decode("ascii")


def load_payload(path: Path) -> dict:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("Le payload doit etre un objet JSON.")
    payload["site"] = SITE
    payload["published"] = True
    if not payload.get("coverImageDataUrl"):
        payload["coverImageDataUrl"] = branded_cover(str(payload.get("slug") or payload.get("title") or "article"))
    return payload


def publish(payload: dict, token: str, idempotency_key: str) -> dict:
    request = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Idempotency-Key": idempotency_key,
            "User-Agent": "hermes-antoinequarroz/1.0",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=90) as response:
        return json.loads(response.read())


def verify(slug: str, distinctive_text: str, attempts: int = 30) -> str:
    url = f"{SITE}/blog/{urllib.parse.quote(slug, safe='')}"
    needle = distinctive_text.strip().lower()
    for _ in range(attempts):
        try:
            with urllib.request.urlopen(url, timeout=20) as response:
                page = response.read().decode("utf-8", errors="replace").lower()
                if response.status == 200 and needle in page:
                    return url
        except urllib.error.URLError:
            pass
        time.sleep(10)
    raise RuntimeError(f"Publication non verifiee apres {attempts * 10} secondes: {url}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--payload", required=True, type=Path)
    parser.add_argument("--verification-text", required=True)
    parser.add_argument("--receipt", type=Path)
    args = parser.parse_args()

    token = os.environ.get("HERMES_PUBLISH_TOKEN", "").strip()
    if len(token) != 64 or any(char not in "0123456789abcdef" for char in token):
        raise SystemExit("HERMES_PUBLISH_TOKEN absent ou invalide.")

    payload = load_payload(args.payload)
    fingerprint = hashlib.sha256((payload["slug"] + "\n" + payload["content"]).encode("utf-8")).hexdigest()[:32]
    result = publish(payload, token, f"hermes-article:{fingerprint}")
    public_url = verify(payload["slug"], args.verification_text)
    receipt = {
        "status": "published",
        "url": public_url,
        "articleId": result.get("article", {}).get("id"),
        "idempotent": bool(result.get("idempotent")),
        "verifiedText": args.verification_text,
    }
    receipt_path = args.receipt or Path("seo/receipts") / f"{payload['slug']}.json"
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
