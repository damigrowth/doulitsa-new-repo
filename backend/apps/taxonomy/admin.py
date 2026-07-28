from django.contrib import admin

from .models import Location, Skill, Tag, TaxonomyNode
from .models.taxonomy_submission import TaxonomySubmission


@admin.register(TaxonomySubmission)
class TaxonomySubmissionAdmin(admin.ModelAdmin):
    list_display = ("id", "label", "type", "status", "category", "submitted_by", "reviewed_by", "created_at")
    list_filter = ("type", "status", "category")
    search_fields = ("label", "submitted_by", "reviewed_by", "assigned_id")
    ordering = ("-created_at",)


# DB-backed taxonomy CRUD. Editing here fires the cache-invalidation signals, so
# changes go live on the site with no redeploy. `raw` is read-only (the original
# import; typed columns below are what the maps now overlay).
@admin.register(TaxonomyNode)
class TaxonomyNodeAdmin(admin.ModelAdmin):
    list_display = ("id", "space", "level", "label", "slug", "parent", "featured", "active")
    list_filter = ("space", "level", "featured", "active")
    search_fields = ("id", "label", "slug")
    list_editable = ("label", "featured", "active")
    readonly_fields = ("raw",)
    list_select_related = ("parent",)
    ordering = ("space", "level", "label")


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug", "type", "parent", "active")
    list_filter = ("type", "active")
    search_fields = ("id", "name", "slug")
    list_editable = ("name", "active")
    readonly_fields = ("raw",)
    ordering = ("name",)


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ("id", "label", "slug", "category", "active")
    list_filter = ("active",)
    search_fields = ("id", "label", "slug")
    list_editable = ("label", "active")
    readonly_fields = ("raw",)
    ordering = ("label",)


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("id", "label", "slug", "active")
    list_filter = ("active",)
    search_fields = ("id", "label", "slug")
    list_editable = ("label", "active")
    readonly_fields = ("raw",)
    ordering = ("label",)
