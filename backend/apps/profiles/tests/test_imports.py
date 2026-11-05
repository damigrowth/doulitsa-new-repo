"""Smoke tests for the profiles app."""
from __future__ import annotations


def test_models_importable() -> None:
    from apps.profiles.models import Profile, ProfileVerification

    assert Profile._meta.db_table == "profiles"
    assert ProfileVerification._meta.db_table == "verifications"
    assert Profile._meta.managed is False
    assert ProfileVerification._meta.managed is False


def test_services_importable() -> None:
    from apps.profiles.services import afm_lookup, profile_updates, verification

    assert callable(profile_updates.update_basic_info)
    assert callable(profile_updates.update_billing)
    assert callable(profile_updates.sync_username)
    assert callable(verification.submit_verification)
    assert callable(afm_lookup.lookup_afm)


def test_serializers_importable() -> None:
    from apps.profiles.serializers.profile_updates import (
        LookupAfmSerializer,
        SubmitVerificationSerializer,
        UpdateBillingSerializer,
    )

    # AFM regex: exactly 9 digits
    assert not LookupAfmSerializer(data={"afm": "12345"}).is_valid()
    assert not LookupAfmSerializer(data={"afm": "12345678a"}).is_valid()
    assert LookupAfmSerializer(data={"afm": "123456789"}).is_valid()

    # Submit verification requires all four fields
    assert not SubmitVerificationSerializer(data={"afm": "123456789"}).is_valid()
    assert SubmitVerificationSerializer(data={
        "afm": "123456789",
        "name": "Test Co",
        "address": "Athens 10001",
        "phone": "+30 210 1234567",
    }).is_valid()

    # Billing requires receipt + invoice booleans
    assert UpdateBillingSerializer(data={"receipt": True, "invoice": False}).is_valid()
    assert not UpdateBillingSerializer(data={}).is_valid()


def test_urls_importable() -> None:
    from apps.profiles.urls import public

    paths = [p.pattern.describe() for p in public.urlpatterns]
    for needle in (
        "me", "me/additional-info", "me/basic-info", "me/billing",
        "me/coverage", "me/portfolio", "me/presentation", "me/verification",
        "by-username/<str:username>", "taxonomy-paths", "lookup-afm",
        "<str:profile_id>/report",
    ):
        assert any(needle in p for p in paths), f"missing route: {needle}"


def test_coverage_normalized_helper() -> None:
    from apps.profiles.services.profile_updates import _coverage_normalized

    assert _coverage_normalized({}) is None
    # Coverage stores location IDS. OLD generateCoverageNormalized doc example
    # (datasets.ts:930-938): areas 216/224 (Γαλάτσι, Γέρακας) + county 2.
    out = _coverage_normalized({"areas": ["216", "224"], "counties": ["2"]})
    assert out == "γαλατσι γερακας αττικης"
    # LOC-1: id 2 is the county "Αττικής" AND a zipcode "12351" — OLD
    # getLocationName checks counties first, so it must never be "12351".
    assert _coverage_normalized({"county": "2", "area": "2", "counties": ["2"], "areas": ["2"]}) == "αττικης"
