"""Serializers for media signing endpoints."""
from __future__ import annotations

from rest_framework import serializers


class SignCloudinaryParamsSerializer(serializers.Serializer):
    paramsToSign = serializers.JSONField()
