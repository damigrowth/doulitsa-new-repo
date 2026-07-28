"""Serializers for the public auth surface."""
from __future__ import annotations

from typing import Any

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.accounts.models.user import UserRole

# ----- Login / register --------------------------------------------------


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(min_length=2, max_length=255)
    password = serializers.CharField(min_length=1, max_length=255, write_only=True)


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=6, max_length=100, write_only=True)
    authType = serializers.ChoiceField(choices=("user", "pro"))
    role = serializers.ChoiceField(
        choices=(UserRole.FREELANCER, UserRole.COMPANY),
        required=False,
        allow_null=True,
    )
    username = serializers.RegexField(
        regex=r"^[a-zA-Z0-9_-]{3,30}$",
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    displayName = serializers.CharField(min_length=1, max_length=80, required=False, allow_blank=True)
    consent = serializers.ListField(child=serializers.CharField(), min_length=1)


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()


class VerifyEmailQuerySerializer(serializers.Serializer):
    token = serializers.CharField(max_length=128)


class ChangePasswordSerializer(serializers.Serializer):
    currentPassword = serializers.CharField(min_length=6, max_length=100, write_only=True)
    newPassword = serializers.CharField(min_length=6, max_length=100, write_only=True)
    confirmPassword = serializers.CharField(min_length=6, max_length=100, write_only=True)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if attrs["newPassword"] != attrs["confirmPassword"]:
            raise serializers.ValidationError({"confirmPassword": "Οι νέοι κωδικοί δεν ταιριάζουν"})
        if attrs["newPassword"] == attrs["currentPassword"]:
            raise serializers.ValidationError(
                {"newPassword": "Ο νέος κωδικός πρέπει να είναι διαφορετικός από τον τρέχοντα"}
            )
        return attrs


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField(min_length=1, max_length=128)
    newPassword = serializers.CharField(min_length=6, max_length=100, write_only=True)


class UpdateAccountSerializer(serializers.Serializer):
    displayName = serializers.CharField(min_length=5, max_length=50)
    image = serializers.JSONField(required=False, allow_null=True)


class ChangeUsernameSerializer(serializers.Serializer):
    newUsername = serializers.RegexField(regex=r"^[a-zA-Z0-9_-]{3,30}$")
    confirmUsername = serializers.CharField()


class DeleteAccountSerializer(serializers.Serializer):
    username = serializers.CharField()
    confirmUsername = serializers.CharField()


class UpgradeToProSerializer(serializers.Serializer):
    username = serializers.RegexField(regex=r"^[a-zA-Z0-9_-]{3,30}$")
    role = serializers.ChoiceField(choices=(UserRole.FREELANCER, UserRole.COMPANY))


class OAuthIntentSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=("user", "pro"))
    role = serializers.ChoiceField(
        choices=(UserRole.FREELANCER, UserRole.COMPANY),
        required=False,
        allow_null=True,
    )


class UpdateUserTypeSerializer(serializers.Serializer):
    userId = serializers.CharField(min_length=1)
    type = serializers.ChoiceField(choices=("user", "pro"))
    role = serializers.ChoiceField(
        choices=(UserRole.FREELANCER, UserRole.COMPANY),
        required=False,
        allow_null=True,
    )


# ----- JWT custom claim --------------------------------------------------


class JwtTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds role/type/step claims to the access token. Wired in SIMPLE_JWT.

    Frontend reads these claims to gate UI without a separate /me hop on
    every navigation.
    """

    @classmethod
    def get_token(cls, user):  # type: ignore[override]
        token = super().get_token(user)
        token["role"] = user.role
        token["type"] = user.type
        token["step"] = user.step
        token["email_verified"] = user.email_verified
        return token
