"""Cloudinary signing services.

Mirrors:
- POST /api/sign-cloudinary-params  (row 4)  — sign arbitrary upload params
                                                so the browser can do unsigned
                                                uploads with the API secret
                                                staying server-side.
- POST /api/admin/media/cloudinary/media-library-token  (row 127) —
                                                generate a timestamped signed
                                                token for the Cloudinary Media
                                                Library widget.
"""
from __future__ import annotations

import time
from typing import Any

from django.conf import settings

from common.exceptions import ApiError, FieldErrors
from common.utils.cloudinary import init_cloudinary, sign_upload_params


def sign_params(params_to_sign: Any) -> dict[str, str]:
    if params_to_sign is None or not isinstance(params_to_sign, dict):
        raise FieldErrors(details={"paramsToSign": ["Required object"]})
    if not settings.CLOUDINARY.get("API_SECRET"):
        raise ApiError("Cloudinary not configured", code="cloudinary_unconfigured", status_code=500)
    return sign_upload_params(params_to_sign)


def generate_media_library_token() -> dict[str, Any]:
    """Generate the {signature, timestamp, apiKey, cloudName} bundle the
    Cloudinary Media Library widget uses to authenticate."""
    cfg = settings.CLOUDINARY
    if not cfg.get("API_SECRET") or not cfg.get("API_KEY") or not cfg.get("CLOUD_NAME"):
        raise ApiError(
            "Cloudinary not configured",
            code="cloudinary_unconfigured",
            status_code=500,
        )

    init_cloudinary()
    timestamp = int(time.time())

    import cloudinary.utils  # local import keeps cold-path tests independent

    signature = cloudinary.utils.api_sign_request(
        {"timestamp": timestamp},
        cfg["API_SECRET"],
    )

    return {
        "signature": signature,
        "timestamp": timestamp,
        "apiKey": cfg["API_KEY"],
        "cloudName": cfg["CLOUD_NAME"],
    }
