"""Static taxonomy dataset access (read-only, cached).

Mirrors the OLD `src/lib/taxonomies/index.ts` lookup helpers that read from
`maps.generated.json`:
  - getSkillsByCategory  (index.ts:229-233)
  - getTags              (index.ts:82-87)
  - findProById          (index.ts:158-161)

The byte-identical maps live in the repo at
`apps/core/management/commands/_taxonomy_maps.json` (see parity-audit row 30).
We load it lazily and cache the parsed dict for the process lifetime, exactly
like the OLD `require(...)` memoization (`_taxonomyMaps`).
"""
from __future__ import annotations

import json
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any

# Resolve the shared maps file. `apps/taxonomy/services/` -> backend root is
# three parents up, then into apps/core/management/commands/.
_MAPS_PATH = (
    Path(__file__).resolve().parents[2]
    / "core"
    / "management"
    / "commands"
    / "_taxonomy_maps.json"
)


@lru_cache(maxsize=1)
def _maps() -> dict[str, Any]:
    with _MAPS_PATH.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def normalize_term(term: str) -> str:
    """Mirror OLD `normalizeTerm` (lib/utils/text/normalize.ts:1-6):

    NFD-decompose, strip combining marks (U+0300–U+036F), lowercase.
    """
    decomposed = unicodedata.normalize("NFD", term)
    stripped = "".join(
        ch for ch in decomposed if not (0x0300 <= ord(ch) <= 0x036F)
    )
    return stripped.lower()


def get_skills_by_category(category_id: str) -> list[dict[str, Any]]:
    """Mirror OLD `getSkillsByCategory` (index.ts:229-233)."""
    maps = _maps()
    skills = maps.get("skills", {})
    by_id = skills.get("byId", {})
    skill_ids = skills.get("byCategory", {}).get(category_id, []) or []
    return [by_id[i] for i in skill_ids if i in by_id]


def get_tags() -> list[dict[str, Any]]:
    """Mirror OLD `getTags` (index.ts:82-87) — full tag list."""
    return list(_maps().get("tags", {}).get("byId", {}).values())


def find_pro_by_id(category_id: str | None) -> dict[str, Any] | None:
    """Mirror OLD `findProById` (index.ts:158-161)."""
    if not category_id:
        return None
    return _maps().get("pro", {}).get("byId", {}).get(category_id)
