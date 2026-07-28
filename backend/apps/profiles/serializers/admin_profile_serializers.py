"""Serializers for the profile admin endpoints."""
from __future__ import annotations

from rest_framework import serializers


class AdminUpdateProfileSerializer(serializers.Serializer):
    displayName = serializers.CharField(required=False, allow_null=True, max_length=255)
    tagline = serializers.CharField(required=False, allow_null=True, max_length=500)
    bio = serializers.CharField(required=False, allow_null=True, max_length=20000)
    category = serializers.CharField(required=False, allow_null=True, max_length=64)
    subcategory = serializers.CharField(required=False, allow_null=True, max_length=64)
    speciality = serializers.CharField(required=False, allow_null=True, max_length=64)
    image = serializers.URLField(required=False, allow_null=True)
    skills = serializers.ListField(child=serializers.CharField(), required=False)


class AdminProfileSettingsSerializer(serializers.Serializer):
    published = serializers.BooleanField(required=False)
    featured = serializers.BooleanField(required=False)
    verified = serializers.BooleanField(required=False)
    top = serializers.BooleanField(required=False)
    isActive = serializers.BooleanField(required=False)


class AdminVerificationStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=("PENDING", "APPROVED", "REJECTED"))
    notes = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=2000)
