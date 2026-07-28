"""CUID generator compatible with Prisma's `cuid()`. Uses cuid2-style format.

We don't strictly need byte-for-byte cuid compatibility since the column type
is text — any URL-safe ID < 64 chars works. We mirror cuid2's format for
familiarity.
"""
from __future__ import annotations

import secrets
import time

_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz"


def cuid(length: int = 24) -> str:
    timestamp = _to_base36(int(time.time() * 1000))
    rand = "".join(secrets.choice(_ALPHABET) for _ in range(max(length - len(timestamp) - 1, 6)))
    return f"c{timestamp}{rand}"[:length]


def _to_base36(n: int) -> str:
    if n == 0:
        return "0"
    digits = []
    while n:
        n, rem = divmod(n, 36)
        digits.append(_ALPHABET[rem])
    return "".join(reversed(digits))
