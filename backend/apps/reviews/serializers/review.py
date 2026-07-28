"""Review serializers."""
from __future__ import annotations

from rest_framework import serializers


class CreateReviewSerializer(serializers.Serializer):
    # OLD validations/review.ts:8-22 — rating 1..5, comment max 350, profileId
    # required, serviceId optional positive int (0 coerced to None below).
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(
        required=False, allow_blank=True, allow_null=True, max_length=350, trim_whitespace=True
    )
    profileId = serializers.CharField(max_length=64)
    serviceId = serializers.IntegerField(required=False, allow_null=True)

    def validate_serviceId(self, value):
        # OLD create-review.ts:50-53 — serviceId 0 → undefined (treated as absent).
        if value == 0:
            return None
        return value


class ModerateReviewSerializer(serializers.Serializer):
    # OLD adminUpdateReviewStatusSchema (validations/admin.ts:502-506) allows
    # pending|approved|rejected and notes up to 1000 chars. 'pending' is used by
    # the admin "revert to pending" action.
    status = serializers.ChoiceField(choices=("pending", "approved", "rejected"))
    notes = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=1000)
