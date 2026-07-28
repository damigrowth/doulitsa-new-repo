"""parity_taxonomy_fks — prove the FK path returns the SAME rows as the legacy
`taxonomy_value_candidates` path, for EVERY taxonomy slug.

For each node slug we compare two id-sets:
  OLD: Service/Profile.filter(<col>__in = taxonomy_value_candidates(slug))
  NEW: Service/Profile.filter(<col>_node_id__in = nodes-with-that-slug-at-level)
and report any slug where they differ. Zero mismatches = the Phase C switch is
behaviour-preserving (the "1000% the same" gate).

  python manage.py parity_taxonomy_fks
"""
from __future__ import annotations

from django.core.management.base import BaseCommand

from apps.core.taxonomy import taxonomy_value_candidates
from apps.profiles.models import Profile
from apps.services.models import Service
from apps.taxonomy.models import TaxonomyNode


class Command(BaseCommand):
    help = "Compare legacy-candidates vs FK filtering across every taxonomy slug."

    def handle(self, *args, **opts):
        total_mismatch = 0
        # (Model, space, [(column, level)])
        plans = [
            (Service, "service", [("category", "category"), ("subcategory", "subcategory"), ("subdivision", "subdivision")]),
            (Profile, "pro", [("category", "category"), ("subcategory", "subcategory")]),
        ]
        for model, space, cols in plans:
            for col, level in cols:
                total_mismatch += self._check(model, space, col, level)
        if total_mismatch:
            self.stdout.write(self.style.ERROR(f"\nPARITY FAILED: {total_mismatch} slug(s) differ."))
            raise SystemExit(1)
        self.stdout.write(self.style.SUCCESS("\nPARITY OK — FK path == legacy path for every slug."))

    def _check(self, model, space: str, col: str, level: str) -> int:
        node_col = f"{col}_node_id"
        # All distinct slugs at this space+level.
        slugs = (
            TaxonomyNode.objects.filter(space=space, level=level)
            .values_list("slug", flat=True).distinct()
        )
        # Precompute slug -> node ids at this level (the FK candidate set).
        nodes_by_slug: dict[str, list[str]] = {}
        for nid, slug in TaxonomyNode.objects.filter(space=space, level=level).values_list("id", "slug"):
            nodes_by_slug.setdefault(slug, []).append(nid)

        mismatches = 0
        checked = 0
        for slug in slugs:
            old_ids = set(model.objects.filter(**{f"{col}__in": taxonomy_value_candidates(slug)}).values_list("id", flat=True))
            new_ids = set(model.objects.filter(**{f"{node_col}__in": nodes_by_slug.get(slug, [])}).values_list("id", flat=True))
            checked += 1
            if old_ids != new_ids:
                mismatches += 1
                only_old = old_ids - new_ids
                only_new = new_ids - old_ids
                self.stdout.write(self.style.WARNING(
                    f"  MISMATCH {model.__name__}.{col} slug={slug!r}: "
                    f"old={len(old_ids)} new={len(new_ids)} "
                    f"only_old={list(only_old)[:3]} only_new={list(only_new)[:3]}"
                ))
        tag = "OK" if mismatches == 0 else f"{mismatches} MISMATCH"
        self.stdout.write(f"  [{tag}] {model.__name__}.{col}: {checked} slugs checked")
        return mismatches
