"""Slug generation. Mirrors `src/lib/utils/text/slug.ts` exactly.

Critical for cross-system compatibility: a service slug created in Next.js and
the same one created in Django must produce identical output.
"""
from __future__ import annotations

import re

from .greek_latin import GREEK_TO_LATIN

# Sort sequences longest-first so multi-char digraphs (αι, μπ, ...) match before
# single letters.
_SEQUENCES = sorted(GREEK_TO_LATIN.keys(), key=len, reverse=True)
_SINGLE_GREEK = re.compile(r"[α-ωΑ-Ωά-ώ]")
_NON_ALPHANUMERIC = re.compile(r"[^a-zA-Z0-9\s]")
_WHITESPACE = re.compile(r"\s+")
_MULTI_HYPHEN = re.compile(r"-+")


def greek_to_latin(text: str) -> str:
    result = text
    for seq in _SEQUENCES:
        result = result.replace(seq, GREEK_TO_LATIN[seq])
    return _SINGLE_GREEK.sub(lambda m: GREEK_TO_LATIN.get(m.group(0), m.group(0)), result)


def create_slug(text: str | None) -> str:
    if not text:
        return ""
    latinized = greek_to_latin(text)
    cleaned = _NON_ALPHANUMERIC.sub("", latinized)
    return _MULTI_HYPHEN.sub(
        "-",
        _WHITESPACE.sub("-", cleaned.strip().lower()),
    )


def generate_service_slug(title: str, numeric_id: int | str) -> str:
    return f"{create_slug(title)}-{numeric_id}"


def find_next_slug_variant(base_slug: str, existing: set[str]) -> str:
    if base_slug not in existing:
        return base_slug
    counter = 2
    while f"{base_slug}-{counter}" in existing:
        counter += 1
    return f"{base_slug}-{counter}"
