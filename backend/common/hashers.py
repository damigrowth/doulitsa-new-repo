"""Password hashers compatible with Better Auth's bcrypt(12) hashes.

Better Auth stored bcrypt hashes directly in the `accounts.password` column
(not Django's `algorithm$iterations$salt$hash` envelope). This hasher detects
raw bcrypt hashes and verifies them, so legacy users can log in without a
password reset. New passwords are written via Argon2 (the default).
"""
from __future__ import annotations

import bcrypt
from django.contrib.auth.hashers import BasePasswordHasher
from django.utils.crypto import get_random_string


class BetterAuthBcryptPasswordHasher(BasePasswordHasher):
    algorithm = "bcrypt_better_auth"

    def salt(self) -> str:
        return get_random_string(length=22)

    def encode(self, password: str, salt: str) -> str:  # type: ignore[override]
        # Match Better Auth's bcrypt(12) cost factor
        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12))
        return f"{self.algorithm}${hashed.decode('utf-8')}"

    def verify(self, password: str, encoded: str) -> bool:
        # Two acceptable encodings:
        #   1. Our envelope:  "bcrypt_better_auth$<bcrypt-hash>"
        #   2. Raw bcrypt hash from the legacy DB: "$2a$12$..." or "$2b$12$..."
        if encoded.startswith(f"{self.algorithm}$"):
            raw = encoded[len(self.algorithm) + 1 :]
        elif encoded.startswith(("$2a$", "$2b$", "$2y$")):
            raw = encoded
        else:
            return False
        try:
            return bcrypt.checkpw(password.encode("utf-8"), raw.encode("utf-8"))
        except Exception:
            return False

    def safe_summary(self, encoded: str) -> dict[str, str]:  # type: ignore[override]
        return {"algorithm": self.algorithm, "encoded": encoded[:8] + "..."}

    def must_update(self, encoded: str) -> bool:
        return False

    def harden_runtime(self, password: str, encoded: str) -> None:
        return None
