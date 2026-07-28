"""Accent-insensitive search normalization. Mirrors `src/lib/utils/text/normalize.ts`."""
from __future__ import annotations

import re
import unicodedata

_COMBINING = re.compile(r"[̀-ͯ]")


def normalize_term(term: str | None) -> str:
    """Lowercase + strip accents (NFD then remove combining marks)."""
    if not term:
        return ""
    decomposed = unicodedata.normalize("NFD", term)
    return _COMBINING.sub("", decomposed).lower()
