"""Serializers for the taxonomy endpoints."""
from __future__ import annotations

from rest_framework import serializers


class SubmitTaxonomySerializer(serializers.Serializer):
    # OLD `submitTaxonomySubmissionSchema` (lib/validations/taxonomy-submission.ts:8-12):
    # label min 2 / max 60, trimmed.
    label = serializers.CharField(min_length=2, max_length=60, trim_whitespace=True)
    type = serializers.ChoiceField(choices=("skill", "tag"))
    category = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=64)


class SkillSerializer(serializers.Serializer):
    label = serializers.CharField(min_length=1, max_length=255)
    slug = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=255)
    category = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=64)


class TagSerializer(serializers.Serializer):
    label = serializers.CharField(min_length=1, max_length=255)
    slug = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=255)


class ServiceTaxonomySerializer(serializers.Serializer):
    label = serializers.CharField(min_length=1, max_length=255)
    slug = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=4000)
    # OLD/frontend send `level` as a string enum (lib/validations/admin.ts:574,597
    # + actions/admin/taxonomies.ts:26), NOT an integer. The previous
    # IntegerField(1-3) rejected every real request with a 400.
    level = serializers.ChoiceField(
        choices=("category", "subcategory", "subdivision"), required=False,
    )
    parentId = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=64)
    featured = serializers.BooleanField(required=False)
    icon = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=64)
    image = serializers.JSONField(required=False, allow_null=True)


class ProTaxonomySerializer(serializers.Serializer):
    label = serializers.CharField(min_length=1, max_length=255)
    slug = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=255)
    plural = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=4000)
    # OLD pro taxonomy levels are category|subcategory only
    # (lib/validations/admin.ts:624,643 + actions/admin/pro-taxonomies.ts:26).
    level = serializers.ChoiceField(
        choices=("category", "subcategory"), required=False,
    )
    parentId = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=64)
    type = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=16)


class CommitChangesSerializer(serializers.Serializer):
    changes = serializers.ListField(child=serializers.JSONField(), allow_empty=False)
    overallMessage = serializers.CharField(min_length=1, max_length=500)
