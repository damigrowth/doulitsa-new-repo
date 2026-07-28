"""Cloudinary helpers — signing, sanitisation, and SDK init.

Mirrors `src/lib/utils/cloudinary.ts` for resource-shape compatibility.
"""
from __future__ import annotations

from typing import Any

import cloudinary
import cloudinary.utils
from django.conf import settings


def init_cloudinary() -> None:
    """Configure the Cloudinary SDK from Django settings.

    Idempotent — safe to call multiple times. Called by services that need
    Cloudinary instead of by app config so missing creds don't break startup.
    """
    cfg = settings.CLOUDINARY
    cloudinary.config(
        cloud_name=cfg["CLOUD_NAME"],
        api_key=cfg["API_KEY"],
        api_secret=cfg["API_SECRET"],
        secure=True,
    )


def sign_upload_params(params_to_sign: dict[str, Any]) -> dict[str, Any]:
    """Generate a signed upload signature.

    Used by `POST /api/sign-cloudinary-params` so the browser can do unsigned
    uploads without exposing the API secret.
    """
    init_cloudinary()
    signature = cloudinary.utils.api_sign_request(
        params_to_sign,
        settings.CLOUDINARY["API_SECRET"],
    )
    return {"signature": signature}


def sanitize_resource(resource: dict[str, Any]) -> dict[str, Any]:
    """Drop volatile / write-only fields before persisting a Cloudinary resource.

    Why: the Next.js code persisted only a known subset of Cloudinary's response
    object so the JSON payloads stay small and predictable.
    """
    keep = {
        "public_id", "secure_url", "url", "asset_id", "version", "format",
        "width", "height", "resource_type", "bytes", "duration",
        "original_filename", "created_at", "tags", "context",
    }
    return {k: v for k, v in resource.items() if k in keep}


def is_pending_resource(resource: dict[str, Any]) -> bool:
    """Mirror OLD `isPendingResource` (cloudinary.ts:412-418): a resource is
    pending if it carries a truthy `_pending` flag or its `public_id` starts
    with `pending_`."""
    if resource.get("_pending"):
        return True
    public_id = resource.get("public_id")
    return bool(public_id) and str(public_id).startswith("pending_")


def sanitize_resources(resources: list[Any] | None) -> list[dict[str, Any]]:
    """Mirror OLD `sanitizeCloudinaryResources` (cloudinary.ts:471-481).

    Filters out half-finished uploads before persisting:
      * pending resources (`_pending` flag or `public_id` startswith `pending_`),
      * `blob:` client-side temporary URLs (`secure_url` startswith `blob:`),
    then strips the `_pending` flag from the survivors.

    Combined with `sanitize_resource`'s key-whitelist so the persisted JSON stays
    small (the NEW backend's existing behaviour).
    """
    out: list[dict[str, Any]] = []
    for r in resources or []:
        if not isinstance(r, dict):
            continue
        if is_pending_resource(r):
            continue
        secure_url = r.get("secure_url")
        if isinstance(secure_url, str) and secure_url.startswith("blob:"):
            continue
        out.append(sanitize_resource(r))
    return out
