"""Auto-invalidate taxonomy caches on any taxonomy DB write, so admin edits go
live without a redeploy. (Bulk ops like the backfill's bulk_update don't fire
these — intentional; the seed/backfill clear caches explicitly if needed.)
"""
from __future__ import annotations

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.taxonomy.models import Location, LocationTree, Skill, Tag, TaxonomyNode
from apps.taxonomy.services.cache import invalidate_taxonomy_caches


@receiver(post_save, sender=TaxonomyNode)
@receiver(post_delete, sender=TaxonomyNode)
@receiver(post_save, sender=Location)
@receiver(post_delete, sender=Location)
@receiver(post_save, sender=LocationTree)
@receiver(post_delete, sender=LocationTree)
@receiver(post_save, sender=Skill)
@receiver(post_delete, sender=Skill)
@receiver(post_save, sender=Tag)
@receiver(post_delete, sender=Tag)
def _on_taxonomy_write(sender, **kwargs):
    invalidate_taxonomy_caches()
