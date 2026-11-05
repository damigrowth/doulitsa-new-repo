"""THE single runtime source of taxonomy maps: the DATABASE. Nothing else.

The static snapshot (`apps/core/management/commands/_taxonomy_maps.json`)
exists ONLY to feed the DB once (`seed_taxonomy`). At runtime no code path
reads it — if the taxonomy tables are empty, the maps are empty and that is
a deploy error to fix with the seed command, not something to paper over
with a stale file (user decision, 2026-11-05).

Caching model (replaces per-process lru_cache + cache_clear fan-out):
- `taxonomy:maps:version` in Redis is the ONLY invalidation signal. Every
  taxonomy write bumps it (signals → `bump_version()`), which is atomic and
  visible to EVERY process at once — web, daphne, celery workers AND
  management commands (the old per-process `cache_clear()` calls only ever
  reached the process that wrote).
- The built maps are stored in Redis WITH the version they were built from
  (`taxonomy:maps:data`), so one process builds and the rest reuse.
- Each process memoizes (version, maps); a memo is reused only while the
  Redis version still matches, so staleness is bounded by one Redis GET.
- An EMPTY build (tables not seeded / DB briefly down) is NEVER memoized or
  stored — the next call retries instead of freezing a bad state until
  restart.
- The maps view takes (version, maps) from ONE call, so the ETag always
  matches the body it was served with (fixes the stale-body-under-new-ETag
  race: a write during a build can no longer pin a 304 loop).
"""
from __future__ import annotations

import uuid
from typing import Any

from django.core.cache import cache

VERSION_KEY = "taxonomy:maps:version"
DATA_KEY = "taxonomy:maps:data"
DATA_TTL = 60 * 60  # safety TTL; version match is the real gate

_memo: tuple[str, dict[str, Any]] | None = None


def current_version() -> str:
    v = cache.get(VERSION_KEY)
    if v is None:
        v = "1"
        cache.set(VERSION_KEY, v, None)
    return str(v)


def bump_version() -> None:
    """Called on every taxonomy DB write (signals). Cross-process by design."""
    cache.set(VERSION_KEY, uuid.uuid4().hex, None)


def get_maps() -> tuple[str, dict[str, Any]]:
    """Return (version, maps) built from the DB — never from the static file.

    The pair is captured atomically from this process's point of view: the
    version is read FIRST, and a build is stored under that version, so a
    concurrent write simply makes the stored entry non-current (next call
    rebuilds) instead of masquerading as fresh.
    """
    global _memo
    v = current_version()
    if _memo is not None and _memo[0] == v:
        return _memo

    stored = cache.get(DATA_KEY)
    if isinstance(stored, dict) and stored.get("v") == v and stored.get("data"):
        _memo = (v, stored["data"])
        return _memo

    try:
        from apps.taxonomy.services.maps_builder import build_maps

        m = build_maps()
    except Exception:  # DB briefly unavailable → empty now, retry next call
        return (v, {})

    if (m.get("service") or {}).get("byId"):
        _memo = (v, m)
        try:
            cache.set(DATA_KEY, {"v": v, "data": m}, DATA_TTL)
        except Exception:  # cache full/down — the memo still serves this process
            pass
        return _memo
    # Tables empty (not seeded): serve empty WITHOUT memoizing.
    return (v, m)


def get_maps_dict() -> dict[str, Any]:
    return get_maps()[1]
