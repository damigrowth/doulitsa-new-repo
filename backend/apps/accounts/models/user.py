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
        """Used by Django's auth backend to decide whether the user can log in."""
        return self.confirmed and not self.blocked and not self.banned

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

    def save(self, *args, **kwargs):
        """Auto-advance the journey step when an admin flips email_verified.

        Why: the verification *endpoint* advances `step` from EMAIL_VERIFICATION
        → TYPE_SELECTION on its own, but a manual flip in Django admin doesn't
        run that path. Without this hook, support staff who tick the box leave
        the user stuck on the "check your email" page.
        """
        if (
            self.pk
            and self.email_verified
            and self.step == JourneyStep.EMAIL_VERIFICATION
        ):
            self.step = JourneyStep.TYPE_SELECTION
            if not self.confirmed:
                self.confirmed = True
        super().save(*args, **kwargs)
