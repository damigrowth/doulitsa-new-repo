"""Serializers for the profile search/count/archive endpoints."""
from __future__ import annotations

from rest_framework import serializers

_SORT_CHOICES = ("recent", "oldest", "price_asc", "price_desc", "rating_high", "rating_low")


class ProfileFiltersSerializer(serializers.Serializer):
    category = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=64)
    subcategory = serializers.JSONField(required=False, allow_null=True)  # str | str[]
    role = serializers.ChoiceField(choices=("freelancer", "company"), required=False, allow_blank=True, allow_null=True)
    published = serializers.BooleanField(required=False, default=True)
    county = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=64)
    online = serializers.BooleanField(required=False, allow_null=True)
    search = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=255)
    page = serializers.IntegerField(required=False, min_value=1, default=1)
    limit = serializers.IntegerField(required=False, min_value=1, max_value=100, default=20)
    sortBy = serializers.ChoiceField(choices=_SORT_CHOICES, required=False, allow_blank=True, allow_null=True)


class ArchiveRequestSerializer(serializers.Serializer):
    archiveType = serializers.ChoiceField(choices=("pros", "companies", "directory"), required=False, default="pros")
    categorySlug = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=64)
    subcategorySlug = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=64)
    limit = serializers.IntegerField(required=False, min_value=1, max_value=100, default=20)
    searchParams = serializers.JSONField(required=False, default=dict)
