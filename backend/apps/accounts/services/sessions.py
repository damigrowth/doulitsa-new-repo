"""Session-security services: refresh-token blacklisting.

Closes the session-security gaps from the parity audit
(`parity-audit/auth-rls.md` sections A & B):

- **Logout (A):** Better Auth's `signOut` destroyed the server session row so
  the token was unusable immediately (`app/api/auth/[...all]/route.ts:4` →
  better-auth handler). The NEW catch-all logout previously only returned
  `{ok: true}` (`views/public/oauth_setup.py:106-109`) and relied on the
  client clearing cookies, leaving the refresh token valid for up to
  `REFRESH_TOKEN_LIFETIME` (14 days). `blacklist_refresh_token` now invalidates
  it server-side via the SimpleJWT blacklist app.

- **Self-service revoke-all (B):** OLD let a user delete their own `sessions`
  rows / "log out everywhere"; the admin equivalent was
  `auth.api.revokeUserSessions` (`actions/admin/users.ts:524-549`,
  `lib/validations/admin.ts:163` `revokeSessionSchema`). NEW had this only
  under admin (`views/admin/users.py`). `revoke_all_for_user` mirrors the OLD
  user-facing "log out everywhere" by blacklisting every outstanding refresh
  token issued to the user.

`rest_framework_simplejwt.token_blacklist` is already in INSTALLED_APPS
(`config/settings/base.py:51`), and `RefreshToken.for_user` records each
refresh token as an `OutstandingToken` row tied to the user.
"""
from __future__ import annotations

from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User


def blacklist_refresh_token(raw_token: str | None) -> bool:
    """Blacklist a single refresh token (logout).

    Returns True if the token was blacklisted by this call, False if the token
    was missing, malformed, expired, or already blacklisted. Logout must never
    fail for the user just because their token is already dead, so every error
    is swallowed — the desired end-state (token unusable) holds regardless.
    """
    if not raw_token:
        return False
    try:
        RefreshToken(raw_token).blacklist()
        return True
    except TokenError:
        # Invalid / expired / already-blacklisted token — nothing left to do.
        return False
    except Exception:
        # Defence in depth: never let logout 500 over token bookkeeping.
        return False


def revoke_all_for_user(user: User) -> int:
    """Blacklist every outstanding refresh token issued to `user`.

    Mirrors the OLD user-facing "log out everywhere" (delete own `sessions`
    rows; admin path `auth.api.revokeUserSessions`,
    `actions/admin/users.ts:524-549`). After this, no existing refresh token
    can be used to mint new access tokens; access tokens already in flight
    expire within the 15-minute access TTL.

    Returns the number of tokens newly blacklisted.
    """
    # Imported lazily so the module stays importable even if the blacklist app
    # migrations haven't run yet (matches the project's defensive import style).
    from rest_framework_simplejwt.token_blacklist.models import (
        BlacklistedToken,
        OutstandingToken,
    )

    revoked = 0
    outstanding = OutstandingToken.objects.filter(user=user)
    for token in outstanding.iterator():
        _, created = BlacklistedToken.objects.get_or_create(token=token)
        if created:
            revoked += 1
    return revoked
