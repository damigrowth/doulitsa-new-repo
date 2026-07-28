"""backfill_taxonomy_fks — populate Service/Profile *_node FKs from the existing
category/subcategory/subdivision CharFields.

Add-alongside: the CharFields stay as source/fallback. Resolution mirrors the old
`taxonomy_value_candidates` matching so Phase C's FK filters return the SAME rows:
  - a stored value equal to a node id (the cuid live data stores)  -> that node,
  - else a slug resolved WITHIN the column's level (service cat/subcat/subdiv,
    pro cat/subcat) — level-scoping disambiguates the 38 slug collisions,
  - else NULL (reported in the null-audit; the old path matched nothing either).

Idempotent + re-runnable (safe on every deploy). Run AFTER `seed_taxonomy`.

  python manage.py backfill_taxonomy_fks            # backfill + audit
  python manage.py backfill_taxonomy_fks --dry-run    # audit only, no writes
"""
from __future__ import annotations

from collections import Counter

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.profiles.models import Profile
from apps.services.models import Service
from apps.taxonomy.models import TaxonomyNode


class Resolver:
    def __init__(self) -> None:
        self.ids_by_space: dict[str, set[str]] = {"service": set(), "pro": set()}
        self.slug_to_id: dict[tuple[str, str, str], str] = {}
        for nid, space, level, slug in TaxonomyNode.objects.values_list("id", "space", "level", "slug"):
            self.ids_by_space.setdefault(space, set()).add(nid)
            # first-wins is fine: any node sharing the slug carries the same slug,
            # so a slug filter matches identically regardless of which id we pick.
            self.slug_to_id.setdefault((space, level, slug), nid)

    def resolve(self, value: str | None, space: str, level: str) -> str | None:
        if not value:
            return None
        if value in self.ids_by_space.get(space, ()):  # direct id (cuid) match
            return value
        return self.slug_to_id.get((space, level, value))  # slug within the column's level


class Command(BaseCommand):
    help = "Backfill Service/Profile taxonomy FKs from the legacy CharFields."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, dry_run: bool = False, **opts):
        r = Resolver()
        self._backfill_services(r, dry_run)
        self._backfill_profiles(r, dry_run)
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — no rows written."))

    def _report(self, label: str, total: int, unresolved: Counter) -> None:
        n_null = sum(unresolved.values())
        self.stdout.write(f"  {label}: {total} rows, {n_null} unresolved value(s)")
        for val, cnt in unresolved.most_common(8):
            self.stdout.write(f"      unresolved {val!r} x{cnt}")

    def _backfill_services(self, r: Resolver, dry: bool) -> None:
        unresolved: Counter = Counter()
        batch, n = [], 0
        for s in Service.objects.all().only("id", "category", "subcategory", "subdivision"):
            cat = r.resolve(s.category, "service", "category")
            sub = r.resolve(s.subcategory, "service", "subcategory")
            div = r.resolve(s.subdivision, "service", "subdivision")
            for stored, got in ((s.category, cat), (s.subcategory, sub), (s.subdivision, div)):
                if stored and not got:
                    unresolved[stored] += 1
            s.category_node_id, s.subcategory_node_id, s.subdivision_node_id = cat, sub, div
            batch.append(s)
            n += 1
        if not dry:
            with transaction.atomic():
                Service.objects.bulk_update(
                    batch, ["category_node_id", "subcategory_node_id", "subdivision_node_id"], batch_size=500
                )
        self._report("services", n, unresolved)

    def _backfill_profiles(self, r: Resolver, dry: bool) -> None:
        unresolved: Counter = Counter()
        batch, n = [], 0
        for p in Profile.objects.all().only("id", "category", "subcategory"):
            cat = r.resolve(p.category, "pro", "category")
            sub = r.resolve(p.subcategory, "pro", "subcategory")
            for stored, got in ((p.category, cat), (p.subcategory, sub)):
                if stored and not got:
                    unresolved[stored] += 1
            p.category_node_id, p.subcategory_node_id = cat, sub
            batch.append(p)
            n += 1
        if not dry:
            with transaction.atomic():
                Profile.objects.bulk_update(batch, ["category_node_id", "subcategory_node_id"], batch_size=500)
        self._report("profiles", n, unresolved)
