"""User model — mirrors the Prisma `users` table 1:1.

We keep the existing PostgreSQL `users` table as-is so the Next.js app and
the Django app can read/write the same rows during the migration window.
Column names use Django snake_case attributes mapped to the original
camelCase columns via `db_column`. `db_table = "users"` matches Prisma's
`@@map("users")`.

We use `AbstractBaseUser` only (NOT `AbstractUser` or `PermissionsMixin`)
because those expect extra columns/tables (groups, user_permissions,
first_name, last_name, is_staff, is_superuser) that don't exist in the
Prisma schema. Permission checks go through DRF permission classes that
read `user.role`.

`managed = True` initially — Prisma owns DDL during cutover. Flip to True
after Phase 7 sign-off when Next.js stops writing.
"""
from __future__ import annotations

from datetime import datetime, timezone as dt_timezone

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models

from common.utils.cuid import cuid


class UserRole(models.TextChoices):
    USER = "user", "user"
    FREELANCER = "freelancer", "freelancer"
    COMPANY = "company", "company"
    ADMIN = "admin", "admin"
    SUPPORT = "support", "support"
    EDITOR = "editor", "editor"


class UserType(models.TextChoices):
    USER = "user", "user"
    PRO = "pro", "pro"


class JourneyStep(models.TextChoices):
    EMAIL_VERIFICATION = "EMAIL_VERIFICATION", "EMAIL_VERIFICATION"
    TYPE_SELECTION = "TYPE_SELECTION", "TYPE_SELECTION"
    OAUTH_SETUP = "OAUTH_SETUP", "OAUTH_SETUP"
    ONBOARDING = "ONBOARDING", "ONBOARDING"
    DASHBOARD = "DASHBOARD", "DASHBOARD"


_ADMIN_LIKE_ROLES = {UserRole.ADMIN, UserRole.SUPPORT, UserRole.EDITOR}
_PRO_LIKE_ROLES = {UserRole.FREELANCER, UserRole.COMPANY}


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email: str, password: str | None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if not user.id:
            user.id = cuid()
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_user(self, email: str, password: str | None = None, **extra_fields):
        extra_fields.setdefault("role", UserRole.USER)
        extra_fields.setdefault("type", UserType.USER)
        extra_fields.setdefault("step", JourneyStep.EMAIL_VERIFICATION)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email: str, password: str | None = None, **extra_fields):
        extra_fields.setdefault("role", UserRole.ADMIN)
        extra_fields.setdefault("email_verified", True)
        extra_fields.setdefault("confirmed", True)
        extra_fields.setdefault("step", JourneyStep.DASHBOARD)
        return self._create_user(email, password, **extra_fields)


class User(AbstractBaseUser):
    # cuid string PK matching Prisma `@default(cuid())`
    id = models.CharField(max_length=64, primary_key=True, editable=False, default=cuid)

    email = models.EmailField(unique=True)
    email_verified = models.BooleanField(default=False, db_column="emailVerified")
    name = models.CharField(max_length=255, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")

    step = models.CharField(
        max_length=32,
        choices=JourneyStep.choices,
        default=JourneyStep.EMAIL_VERIFICATION,
    )
    confirmed = models.BooleanField(default=False)
    blocked = models.BooleanField(default=False)

    username = models.CharField(max_length=255, unique=True, null=True, blank=True)
    display_username = models.CharField(
        max_length=255, unique=True, null=True, blank=True, db_column="displayUsername",
    )
    display_name = models.CharField(max_length=255, null=True, blank=True, db_column="displayName")
    first_name = models.CharField(max_length=255, null=True, blank=True, db_column="firstName")
    last_name = models.CharField(max_length=255, null=True, blank=True, db_column="lastName")
    image = models.URLField(max_length=2048, null=True, blank=True)

    ban_expires = models.DateTimeField(null=True, blank=True, db_column="banExpires")
    ban_reason = models.TextField(null=True, blank=True, db_column="banReason")
    banned = models.BooleanField(default=False)

    test_user = models.BooleanField(default=False, db_column="testUser")
    type = models.CharField(max_length=8, choices=UserType.choices, default=UserType.USER)
    role = models.CharField(max_length=16, choices=UserRole.choices, default=UserRole.USER)
    provider = models.CharField(max_length=32, default="email")  # 'email' | 'google'

    last_unread_email_sent_at = models.DateTimeField(
        null=True, blank=True, db_column="lastUnreadEmailSentAt",
    )
    last_username_change_at = models.DateTimeField(
        null=True, blank=True, db_column="lastUsernameChangeAt",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    objects = UserManager()

    class Meta:
        db_table = "users"
        managed = True
        indexes = [
            models.Index(fields=["role"]),
            models.Index(fields=["step"]),
            models.Index(fields=["confirmed", "blocked"]),
        ]

    # ----- Django auth integration: derived properties only -----

    @property
    def is_active(self) -> bool:  # type: ignore[override]
        """Used by Django's auth backend + SimpleJWT `get_user` to decide whether
        the user may hold a session.

        OLD parity (AUTH-G4 / P1-7): `confirmed` never gated sign-in in OLD
        (login.ts checked only `blocked`; better-auth's admin plugin refused
        only an UNEXPIRED ban). So: not blocked, and no ban in force. An
        expired ban (`ban_expires` in the past) no longer locks the user out.
        """
        return not self.blocked and not self.is_ban_active()

    def is_ban_active(self, now: datetime | None = None) -> bool:
        """True while a ban is in force: banned with no expiry, or an expiry
        still in the future (better-auth admin plugin semantics)."""
        if not self.banned:
            return False
        if self.ban_expires is None:
            return True
        return self.ban_expires > (now or datetime.now(dt_timezone.utc))

    def clear_expired_ban(self) -> bool:
        """Auto-unban once `ban_expires` has passed, as better-auth's admin
        plugin did on session creation (`CcYw7b-A.mjs:100-131`). Returns True
        when the row was updated."""
        if self.banned and self.ban_expires is not None and not self.is_ban_active():
            self.banned = False
            self.ban_reason = None
            self.ban_expires = None
            self.save(update_fields=["banned", "ban_reason", "ban_expires", "updated_at"])
            return True
        return False

    @property
    def is_authenticated(self) -> bool:  # type: ignore[override]
        return True

    @property
    def is_anonymous(self) -> bool:  # type: ignore[override]
        return False

    @property
    def is_staff(self) -> bool:
        return self.role in _ADMIN_LIKE_ROLES

    @property
    def is_superuser(self) -> bool:
        return self.role == UserRole.ADMIN

    def has_perm(self, perm, obj=None) -> bool:
        return self.role == UserRole.ADMIN

    def has_perms(self, perm_list, obj=None) -> bool:
        return self.role == UserRole.ADMIN

    def has_module_perms(self, app_label) -> bool:
        return self.is_staff

    # ----- Domain helpers used by services / permissions -----

    def is_admin(self) -> bool:
        return self.role == UserRole.ADMIN

    def is_professional(self) -> bool:
        return self.role in _PRO_LIKE_ROLES

    def is_pro(self) -> bool:
        return self.type == UserType.PRO

    def __str__(self) -> str:
        return self.email or self.id

    @classmethod
    def from_db(cls, db, field_names, values):
        instance = super().from_db(db, field_names, values)
        # Remember the loaded email_verified so save() can detect the
        # False→True transition (None when the field was deferred).
        instance._loaded_email_verified = instance.__dict__.get("email_verified")
        return instance

    def save(self, *args, **kwargs):
        """Auto-advance the journey step when email_verified flips False→True.

        Why: the verification *endpoint* (services.registration.verify_email_token)
        advances `step` from EMAIL_VERIFICATION on its own, but a manual flip in
        Django admin / the admin status endpoint doesn't run that path. Without
        this hook, support staff who tick the box leave the user stuck on the
        "check your email" page.

        OLD parity (SM-D2, config.ts:416-453): the advance ran only on the
        verification UPDATE itself, and never touched `confirmed`. So this hook
        fires only on the actual False→True transition of a loaded row (not on
        every save of an already-verified user, which used to override admin
        step edits), only for provider=email (as OLD), and leaves `confirmed`
        alone.

        Mirrors the endpoint: pros → ONBOARDING, simple users → DASHBOARD.
        """
        update_fields = kwargs.get("update_fields")
        was_verified = getattr(self, "_loaded_email_verified", None)
        if (
            self.pk
            and not self._state.adding
            and was_verified is False
            and self.email_verified
            and self.step == JourneyStep.EMAIL_VERIFICATION
            and (self.provider or "email") == "email"
            and (update_fields is None or "email_verified" in update_fields)
        ):
            self.step = (
                JourneyStep.ONBOARDING if self.type == UserType.PRO else JourneyStep.DASHBOARD
            )
            if update_fields is not None:
                kwargs["update_fields"] = {*update_fields, "step"}
        super().save(*args, **kwargs)
        if update_fields is None or "email_verified" in (update_fields or ()):
            self._loaded_email_verified = self.email_verified
