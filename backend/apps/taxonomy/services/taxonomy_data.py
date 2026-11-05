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

import unicodedata
from typing import Any


def _maps() -> dict[str, Any]:
    # CG-8: the LIVE DB maps (version-cached in the store) — never the static
    # seed file. Skills/tags approved in the admin are seen here immediately,
    # so the submissions duplicate-check can no longer re-accept an
    # already-approved term (user decision 2026-11-05: the static file only
    # ever feeds the DB once, nothing reads it at runtime).
    from apps.taxonomy.services import store

    return store.get_maps_dict()


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
