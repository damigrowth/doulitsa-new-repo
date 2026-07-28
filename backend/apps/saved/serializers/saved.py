"""Saved-item serializers."""
from __future__ import annotations

from rest_framework import serializers


class ToggleSaveSerializer(serializers.Serializer):
    itemType = serializers.ChoiceField(choices=("service", "profile"))
    itemId = serializers.CharField(max_length=64)


class SavedListQuerySerializer(serializers.Serializer):
    servicesPage = serializers.IntegerField(required=False, min_value=1, default=1)
    servicesLimit = serializers.IntegerField(required=False, min_value=1, max_value=100, default=20)
    profilesPage = serializers.IntegerField(required=False, min_value=1, default=1)
    profilesLimit = serializers.IntegerField(required=False, min_value=1, max_value=100, default=20)
