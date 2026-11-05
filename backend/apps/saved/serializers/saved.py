"""Saved-item serializers."""
from __future__ import annotations

from rest_framework import serializers


class ToggleSaveSerializer(serializers.Serializer):
    itemType = serializers.ChoiceField(choices=("service", "profile"))
    itemId = serializers.CharField(max_length=64)


class _LenientInt(serializers.Field):
    """Query int that falls back to `default_value` (and clamps to
    [1, max_value]) instead of 400ing. P3-13 / p3rev N1: `/dashboard/saved`
    with a bad `?page=` showed the error page; OLD parseInt fell back."""

    def __init__(self, *, default_value: int, max_value: int | None = None, **kwargs):
        kwargs.setdefault("required", False)
        kwargs.setdefault("default", default_value)
        self.default_value = default_value
        self.max_value = max_value
        super().__init__(**kwargs)

    def validate_empty_values(self, data):
        if data is None or data == "":
            return (True, self.default_value)
        return super().validate_empty_values(data)

    def to_internal_value(self, data):
        if isinstance(data, list):  # repeated ?x=1&x=2
            data = data[-1] if data else None
        try:
            value = int(float(data))
        except (TypeError, ValueError, OverflowError):
            return self.default_value
        if value < 1:
            return self.default_value
        if self.max_value is not None and value > self.max_value:
            return self.max_value
        return value

    def to_representation(self, value):
        return value


class SavedListQuerySerializer(serializers.Serializer):
    servicesPage = _LenientInt(default_value=1)
    servicesLimit = _LenientInt(default_value=20, max_value=100)
    profilesPage = _LenientInt(default_value=1)
    profilesLimit = _LenientInt(default_value=20, max_value=100)
