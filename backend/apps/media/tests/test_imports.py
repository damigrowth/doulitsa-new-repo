"""Smoke tests for the media app."""
from __future__ import annotations


def test_models_importable() -> None:
    from apps.media.models import Media

    assert Media is not None
    assert Media._meta.db_table == "media"
    assert Media._meta.managed is False


def test_services_importable() -> None:
    from apps.media.services.cloudinary_signing import (
        generate_media_library_token,
        sign_params,
    )

    assert callable(sign_params)
    assert callable(generate_media_library_token)


def test_views_and_urls_importable() -> None:
    from apps.media.urls import admin as admin_urls
    from apps.media.urls import public as public_urls

    pub_paths = [p.pattern.describe() for p in public_urls.urlpatterns]
    adm_paths = [p.pattern.describe() for p in admin_urls.urlpatterns]
    assert any("sign-cloudinary-params" in p for p in pub_paths)
    assert any("media-library-token" in p for p in adm_paths)


def test_sign_params_validates_input() -> None:
    """Without Cloudinary creds the call should fail with a clear error,
    not crash. We verify it raises an ApiError with the expected code.
    """
    from django.test import override_settings

    from apps.media.services.cloudinary_signing import sign_params
    from common.exceptions import FieldErrors

    # Empty input → field error
    try:
        sign_params(None)
    except FieldErrors as exc:
        assert "paramsToSign" in (exc.details or {})
    else:
        raise AssertionError("expected FieldErrors")

    # No API secret configured → cloudinary_unconfigured ApiError
    with override_settings(CLOUDINARY={"API_KEY": "", "API_SECRET": "", "CLOUD_NAME": ""}):
        from common.exceptions import ApiError
        try:
            sign_params({"timestamp": 1})
        except ApiError as exc:
            assert exc.default_code == "cloudinary_unconfigured"
        else:
            raise AssertionError("expected ApiError(cloudinary_unconfigured)")
