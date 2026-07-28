"""Serializers for admin user-management endpoints."""
from __future__ import annotations

from typing import Any

from rest_framework import serializers

from apps.accounts.models import Account, Session, User
from apps.accounts.models.user import JourneyStep, UserRole, UserType


# ----- Read -----


class AdminAccountSerializer(serializers.ModelSerializer):
    providerId = serializers.CharField(source="provider_id")
    accountId = serializers.CharField(source="account_id")
    createdAt = serializers.DateTimeField(source="created_at")
    accessTokenExpiresAt = serializers.DateTimeField(source="access_token_expires_at", allow_null=True)
    refreshTokenExpiresAt = serializers.DateTimeField(source="refresh_token_expires_at", allow_null=True)

    class Meta:
        model = Account
        fields = (
            "id", "providerId", "accountId", "scope",
            "createdAt", "accessTokenExpiresAt", "refreshTokenExpiresAt",
        )


class AdminSessionSerializer(serializers.ModelSerializer):
    userId = serializers.CharField(source="user_id")
    expiresAt = serializers.DateTimeField(source="expires_at")
    createdAt = serializers.DateTimeField(source="created_at")
    ipAddress = serializers.CharField(source="ip_address", allow_null=True)
    userAgent = serializers.CharField(source="user_agent", allow_null=True)
    impersonatedBy = serializers.CharField(source="impersonated_by", allow_null=True)

    class Meta:
        model = Session
        fields = (
            "id", "userId", "expiresAt", "createdAt", "token",
            "ipAddress", "userAgent", "impersonatedBy",
        )


class AdminUserSerializer(serializers.ModelSerializer):
    """Detail/list payload — mirrors the User shape the Next.js admin UI expects."""

    emailVerified = serializers.BooleanField(source="email_verified")
    displayName = serializers.CharField(source="display_name", allow_null=True)
    displayUsername = serializers.CharField(source="display_username", allow_null=True)
    firstName = serializers.CharField(source="first_name", allow_null=True)
    lastName = serializers.CharField(source="last_name", allow_null=True)
    banExpires = serializers.DateTimeField(source="ban_expires", allow_null=True)
    banReason = serializers.CharField(source="ban_reason", allow_null=True)
    testUser = serializers.BooleanField(source="test_user")
    lastUnreadEmailSentAt = serializers.DateTimeField(source="last_unread_email_sent_at", allow_null=True)
    lastUsernameChangeAt = serializers.DateTimeField(source="last_username_change_at", allow_null=True)
    createdAt = serializers.DateTimeField(source="created_at")
    updatedAt = serializers.DateTimeField(source="updated_at")

    class Meta:
        model = User
        fields = (
            "id", "email", "emailVerified", "name",
            "username", "displayUsername", "displayName",
            "firstName", "lastName", "image",
            "step", "confirmed", "blocked", "banned",
            "banExpires", "banReason", "testUser",
            "type", "role", "provider",
            "lastUnreadEmailSentAt", "lastUsernameChangeAt",
            "createdAt", "updatedAt",
        )


class AdminUserDetailSerializer(serializers.Serializer):
    user = AdminUserSerializer()
    accounts = AdminAccountSerializer(many=True)
    sessions = AdminSessionSerializer(many=True)


# ----- Write -----


class AdminCreateUserSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=6, max_length=100, write_only=True)
    role = serializers.ChoiceField(choices=[(r.value, r.value) for r in UserRole])
    name = serializers.CharField(required=False, allow_blank=True, max_length=100)
    displayName = serializers.CharField(required=False, allow_blank=True, max_length=100)
    username = serializers.RegexField(regex=r"^[a-zA-Z0-9_-]{3,30}$", required=False, allow_blank=True)


class AdminSetUserRoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=[(r.value, r.value) for r in UserRole])


class AdminBanUserSerializer(serializers.Serializer):
    banReason = serializers.CharField(required=False, allow_blank=True, max_length=500)
    banExpiresIn = serializers.IntegerField(required=False, allow_null=True, min_value=1)


class AdminBanStatusSerializer(serializers.Serializer):
    banned = serializers.BooleanField()
    banReason = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=500)
    banExpires = serializers.DateTimeField(required=False, allow_null=True)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if attrs.get("banned") and not attrs.get("banReason"):
            raise serializers.ValidationError({"banReason": "Required when banning a user"})
        return attrs


class AdminSetPasswordSerializer(serializers.Serializer):
    newPassword = serializers.CharField(min_length=6, max_length=100, write_only=True)


class AdminUpdateBasicInfoSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, allow_null=True, max_length=255)
    email = serializers.EmailField(required=False, allow_null=True)
    username = serializers.RegexField(
        regex=r"^[a-zA-Z0-9_-]{3,30}$", required=False, allow_null=True
    )
    displayName = serializers.CharField(required=False, allow_null=True, max_length=100)


class AdminUpdateStatusSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=[(t.value, t.value) for t in UserType], required=False)
    confirmed = serializers.BooleanField(required=False)
    blocked = serializers.BooleanField(required=False)
    emailVerified = serializers.BooleanField(required=False)
    step = serializers.ChoiceField(choices=[(s.value, s.value) for s in JourneyStep], required=False)


class AdminUpdateImageSerializer(serializers.Serializer):
    image = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class AdminToggleBlockSerializer(serializers.Serializer):
    blocked = serializers.BooleanField()


class AdminToggleConfirmSerializer(serializers.Serializer):
    confirmed = serializers.BooleanField()


class AdminUpdateStepSerializer(serializers.Serializer):
    step = serializers.ChoiceField(choices=[(s.value, s.value) for s in JourneyStep])


class AdminUpdateUserSerializer(serializers.Serializer):
    """PATCH /api/admin/users/{id}/ — only role currently mutable here (matches Next.js)."""

    role = serializers.ChoiceField(
        choices=[(r.value, r.value) for r in UserRole], required=False
    )


# ----- Team -----


class AdminAssignRoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=[(r.value, r.value) for r in UserRole])


class AdminTeamMemberSerializer(serializers.Serializer):
    id = serializers.CharField()
    email = serializers.EmailField()
    username = serializers.CharField(allow_null=True)
    displayName = serializers.CharField(source="display_name", allow_null=True)
    role = serializers.CharField()
    image = serializers.CharField(allow_null=True)
    createdAt = serializers.DateTimeField(source="created_at")
