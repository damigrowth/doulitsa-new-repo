"""Serializers for the profile search/count/archive endpoints."""
from __future__ import annotations

from rest_framework import serializers

_SORT_CHOICES = ("recent", "oldest", "price_asc", "price_desc", "rating_high", "rating_low")


class ProfileFiltersSerializer(serializers.Serializer):
    category = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=64)
    subcategory = serializers.JSONField(required=False, allow_null=True)  # str | str[]
    role = serializers.ChoiceField(choices=("freelancer", "company"), required=False, allow_blank=True, allow_null=True)
    # NO `published` field (P1-3 AUTHZ-PUB): /profiles/search + /count are
    # AllowAny; a caller-controlled `published:false` listed unpublished
    # profiles and poisoned the shared count cache. The selectors force True.
    county = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=64)
    online = serializers.BooleanField(required=False, allow_null=True)
    search = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=255)
    page = serializers.IntegerField(required=False, min_value=1, default=1)
    limit = serializers.IntegerField(required=False, min_value=1, max_value=100, default=20)
    sortBy = serializers.ChoiceField(choices=_SORT_CHOICES, required=False, allow_blank=True, allow_null=True)


class LenientIntegerField(serializers.Field):
    """Integer param that falls back instead of failing: missing/null/NaN/
    non-numeric → `default_value`, clamped to [min_value, max_value].
    Mirrors OLD `params.limit || 20` (P3-13 XC-PAGEPARAMS: a bad ?limit made
    the /dir pages 500/404 because parseInt → NaN → JSON null → 400)."""

    def __init__(self, *, default_value: int, min_value: int = 1, max_value: int | None = None, **kwargs):
        kwargs.setdefault("required", False)
        kwargs.setdefault("default", default_value)
        self.default_value = default_value
        self.min_value = min_value
        self.max_value = max_value
        super().__init__(**kwargs)

    def validate_empty_values(self, data):
        if data is None:
            return (True, self.default_value)
        return super().validate_empty_values(data)

    def to_internal_value(self, data):
        try:
            value = int(float(data)) if not isinstance(data, bool) else self.default_value
        except (TypeError, ValueError, OverflowError):
            return self.default_value
        if value < self.min_value:
            return self.default_value if value <= 0 else self.min_value
        if self.max_value is not None and value > self.max_value:
            return self.max_value
        return value

    def to_representation(self, value):
        return value


class ArchiveRequestSerializer(serializers.Serializer):
    archiveType = serializers.ChoiceField(choices=("pros", "companies", "directory"), required=False, default="pros")
    categorySlug = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=64)
    subcategorySlug = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=64)
    limit = LenientIntegerField(default_value=20, min_value=1, max_value=100)
    searchParams = serializers.JSONField(required=False, default=dict)
