"""Recompute `profiles.coverageNormalized` from `coverage` (LOC-1).

The NEW stack used to build `coverageNormalized` through a flat, colliding
location id → name map (e.g. county id `2` "Αττικής" → zipcode "12351"), which
broke location text search for every profile whose coverage was saved by the
new stack. `_coverage_normalized` now ports OLD `getLocationName` literally;
this command re-derives the column for existing rows.

    python manage.py renormalize_coverage            # dry run: report diffs
    python manage.py renormalize_coverage --apply    # write the changes

By default only rows whose stored value is exactly what the PRE-FIX new-stack
algorithm (flat `Location` id → name map) produced are touched — i.e. rows the
new stack wrote. Rows written by OLD (some carry names from an older location
dataset, e.g. "αττικη") are left byte-for-byte as OLD left them. `--all`
recomputes every row regardless.

Writes with a queryset `.update()` (no `updatedAt` bump, so profile ordering is
not disturbed) and purges the public profile caches once at the end.
"""
from __future__ import annotations

from django.core.management.base import BaseCommand

from apps.profiles.models import Profile
from apps.profiles.services import profile_updates
from apps.profiles.services.profile_updates import _coverage_normalized


def _legacy_flat_normalized(coverage: dict, flat: dict[str, str]) -> str | None:
    """The pre-fix NEW algorithm: same walk, but names from the flat
    (last-write-wins) `Location` id → name map."""
    from apps.core import locations

    original = locations.location_name_for_id
    try:
        locations.location_name_for_id = lambda i: flat.get(str(i)) if i else None  # type: ignore[assignment]
        return profile_updates._coverage_normalized(coverage)
    finally:
        locations.location_name_for_id = original  # type: ignore[assignment]


class Command(BaseCommand):
    help = "Recompute profiles.coverageNormalized with the OLD getLocationName order."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Write the changes (default: dry run).")
        parser.add_argument("--verbose-diff", action="store_true", help="Print every changed row.")
        parser.add_argument("--all", action="store_true", dest="all_rows",
                            help="Recompute every row (default: only rows written by the pre-fix new stack).")

    def handle(self, *args, apply: bool = False, verbose_diff: bool = False, all_rows: bool = False, **opts):
        from apps.taxonomy.models import Location

        flat = {str(i): str(n) for i, n in Location.objects.values_list("id", "name") if n}
        changed = 0
        scanned = 0
        qs = Profile.objects.exclude(coverage__isnull=True).only("id", "username", "coverage", "coverage_normalized")
        for p in qs.iterator(chunk_size=500):
            scanned += 1
            expected = _coverage_normalized(p.coverage if isinstance(p.coverage, dict) else {})
            if (p.coverage_normalized or None) == (expected or None):
                continue
            if not all_rows:
                buggy = _legacy_flat_normalized(p.coverage if isinstance(p.coverage, dict) else {}, flat)
                if (p.coverage_normalized or None) != (buggy or None):
                    continue  # not written by the pre-fix new stack → leave OLD data alone
            changed += 1
            if verbose_diff or not apply:
                self.stdout.write(f"{p.id} @{p.username}: {p.coverage_normalized!r} -> {expected!r}")
            if apply:
                Profile.objects.filter(id=p.id).update(coverage_normalized=expected)

        if apply and changed:
            from apps.profiles.services.cache import invalidate_profile_caches

            invalidate_profile_caches(None)
            try:
                from django.core.cache import cache

                cache.delete_pattern("services:suggest:*")
            except Exception:
                pass

        mode = "updated" if apply else "would update"
        self.stdout.write(self.style.SUCCESS(f"scanned {scanned}, {mode} {changed}"))
