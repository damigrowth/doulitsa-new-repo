"""Translate cuid-style taxonomy IDs in `services` and `profiles` columns
into the canonical slug strings the frontend taxonomy uses.

The Strapi-era production dump stored taxonomy nodes by cuid in
`services.category/subcategory/subdivision` and
`profiles.category/subcategory/speciality`, plus in the array columns
`services.tags` and `profiles.skills`. The Django selectors and the Next.js
helpers filter on slug strings; without translation those queries return zero
results.

Idempotent: only rewrites a cell when its current value resolves to a node in
the taxonomy `byId` map. Slug values and unknown junk are left alone.

Usage (inside the backend container):
    python manage.py canonicalize_taxonomies
    python manage.py canonicalize_taxonomies --dry-run
"""
from __future__ import annotations

import json
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.profiles.models.profile import Profile
from apps.services.models.service import Service

MAPS_PATH = Path(__file__).with_name("_taxonomy_maps.json")


class Command(BaseCommand):
    help = "Canonicalize cuid taxonomy IDs in service/profile columns to slugs."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")

    @transaction.atomic
    def handle(self, *args, dry_run: bool = False, **opts):
        data = json.loads(MAPS_PATH.read_text())
        service_by_id: dict[str, dict] = data["service"]["byId"]
        pro_by_id: dict[str, dict] = data["pro"]["byId"]
        skill_by_id: dict[str, dict] = data.get("skills", {}).get("byId", {})

        def translate(val: str | None, by_id: dict[str, dict]) -> str | None:
            if not val:
                return val
            node = by_id.get(val)
            return node["slug"] if node else val

        def translate_list(values, by_id: dict[str, dict]):
            if not values:
                return values
            return [translate(v, by_id) for v in values]

        # ----- services -----
        svc_changed = 0
        for s in Service.objects.iterator(chunk_size=500):
            new_cat = translate(s.category, service_by_id)
            new_sub = translate(s.subcategory, service_by_id)
            new_div = translate(s.subdivision, service_by_id)
            new_tags = translate_list(s.tags, service_by_id)
            if (new_cat, new_sub, new_div, new_tags) == (s.category, s.subcategory, s.subdivision, s.tags):
                continue
            s.category, s.subcategory, s.subdivision, s.tags = new_cat, new_sub, new_div, new_tags
            if not dry_run:
                s.save(update_fields=["category", "subcategory", "subdivision", "tags"])
            svc_changed += 1
        self.stdout.write(f"  services updated:  {svc_changed}")

        # ----- profiles -----
        prof_changed = 0
        for p in Profile.objects.iterator(chunk_size=500):
            new_cat = translate(p.category, pro_by_id)
            new_sub = translate(p.subcategory, pro_by_id)
            new_spec = translate(p.speciality, pro_by_id)
            # Skills sit under their own taxonomy. Some profiles also carry
            # service-ish skills; try the skill map first, fall back to the
            # service map so partial cases still resolve.
            def t_skill(v: str) -> str:
                return translate(v, skill_by_id) if skill_by_id.get(v) else translate(v, service_by_id)
            new_skills = [t_skill(v) for v in (p.skills or [])]
            if (new_cat, new_sub, new_spec, new_skills) == (p.category, p.subcategory, p.speciality, p.skills):
                continue
            p.category, p.subcategory, p.speciality, p.skills = new_cat, new_sub, new_spec, new_skills
            if not dry_run:
                p.save(update_fields=["category", "subcategory", "speciality", "skills"])
            prof_changed += 1
        self.stdout.write(f"  profiles updated:  {prof_changed}")

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — nothing was committed"))
            transaction.set_rollback(True)
        else:
            self.stdout.write(self.style.SUCCESS("Canonicalization complete."))
