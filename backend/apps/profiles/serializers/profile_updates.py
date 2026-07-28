"""Serializers for the public profile-update endpoints (rows 33-39).

Validation rules are ported VERBATIM from the OLD Zod schemas in
`src/lib/validations/profile.ts`. Each rule cites its OLD source so behaviour
(including which schema the action actually used) stays identical.
"""
from __future__ import annotations

import re

from rest_framework import serializers


# ----- helpers -------------------------------------------------------------


def _strip_html_tags(value: str | None) -> str:
    """Mirror OLD `stripHtmlTags` — remove tags, leaving text content."""
    if not value:
        return ""
    return re.sub(r"<[^>]*>", "", value)


# ----- basic-info ----------------------------------------------------------


class UpdateBasicInfoSerializer(serializers.Serializer):
    """Mirrors OLD `profileBasicInfoUpdateSchema` (profile.ts:458-487)."""

    tagline = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    bio = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    category = serializers.CharField(max_length=64)
    subcategory = serializers.CharField(max_length=64)
    speciality = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=64)
    image = serializers.JSONField(required=False, allow_null=True)
    skills = serializers.ListField(
        child=serializers.CharField(max_length=64),
        required=False,
        allow_empty=True,
    )
    coverage = serializers.JSONField(required=False, allow_null=True)

    def validate_tagline(self, value):
        # OLD: val === '' || val.length >= 10, and val.length <= 100.
        if value in (None, ""):
            return value
        if len(value) < 10:
            raise serializers.ValidationError(
                "Το tagline πρέπει να έχει τουλάχιστον 10 χαρακτήρες"
            )
        if len(value) > 100:
            raise serializers.ValidationError(
                "Το tagline δεν μπορεί να υπερβαίνει τους 100 χαρακτήρες"
            )
        return value

    def validate_bio(self, value):
        # OLD: stripHtmlTags(val).length >= 80 and <= 5000 (profile.ts:469-478).
        stripped = _strip_html_tags(value)
        if len(stripped) < 80:
            raise serializers.ValidationError(
                "Η περιγραφή πρέπει να έχει τουλάχιστον 80 χαρακτήρες"
            )
        if len(stripped) > 5000:
            raise serializers.ValidationError(
                "Η περιγραφή δεν μπορεί να υπερβαίνει τους 5000 χαρακτήρες"
            )
        return value

    def validate_category(self, value):
        # OLD: z.string().min(1, 'Η κατηγορία είναι υποχρεωτική').
        if not value:
            raise serializers.ValidationError("Η κατηγορία είναι υποχρεωτική")
        return value

    def validate_subcategory(self, value):
        # OLD: z.string().min(1, 'Η υποκατηγορία είναι υποχρεωτική').
        if not value:
            raise serializers.ValidationError("Η υποκατηγορία είναι υποχρεωτική")
        return value

    def validate_skills(self, value):
        # OLD: .max(10, 'Μπορείτε να επιλέξετε έως 10 δεξιότητες').
        if value and len(value) > 10:
            raise serializers.ValidationError(
                "Μπορείτε να επιλέξετε έως 10 δεξιότητες"
            )
        return value


# ----- additional-info -----------------------------------------------------


class UpdateAdditionalInfoSerializer(serializers.Serializer):
    """Mirrors OLD `profileAdditionalInfoUpdateSchema` (profile.ts:490-499).

    NOTE: the UPDATE schema the action uses enforces only `rate >= 0`
    (int), NOT the stricter min(10)/max(50000) of `additionalProfileInfoSchema`.
    Replicate the lenient update-schema rule.
    """

    rate = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    commencement = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=32)
    experience = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    contactMethods = serializers.ListField(child=serializers.CharField(), required=False)
    paymentMethods = serializers.ListField(child=serializers.CharField(), required=False)
    settlementMethods = serializers.ListField(child=serializers.CharField(), required=False)
    budget = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=64)
    terms = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=4000)


# ----- billing -------------------------------------------------------------


class UpdateBillingSerializer(serializers.Serializer):
    """Mirrors OLD `billingSchema` (profile.ts:367-421) with cross-field refines."""

    receipt = serializers.BooleanField()
    invoice = serializers.BooleanField()
    afm = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    doy = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=255)
    name = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=255)
    profession = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=255)
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=512)

    def validate(self, attrs):
        receipt = attrs.get("receipt")
        invoice = attrs.get("invoice")
        # OLD refine #1: at least one of receipt/invoice (profile.ts:377-386).
        if not (receipt or invoice):
            raise serializers.ValidationError("Παρακαλώ επιλέξτε τύπο παραστατικού")

        if invoice:
            # OLD refine #2: all invoice fields required (profile.ts:387-409).
            required = ["afm", "doy", "name", "profession", "address"]
            if not all((attrs.get(f) or "").strip() for f in required):
                raise serializers.ValidationError(
                    "Όλα τα πεδία είναι υποχρεωτικά όταν επιλέγεται τιμολόγιο"
                )
            # OLD refine #3: afm exactly 9 digits when invoice (profile.ts:410-421).
            afm = (attrs.get("afm") or "").strip()
            if afm and not re.fullmatch(r"\d{9}", afm):
                raise serializers.ValidationError("Ο ΑΦΜ πρέπει να είναι ακριβώς 9 ψηφία")
        return attrs


# ----- coverage ------------------------------------------------------------


class UpdateCoverageSerializer(serializers.Serializer):
    """Mirrors OLD `coverageSchema` (profile.ts:111-167)."""

    coverage = serializers.JSONField()

    def validate_coverage(self, data):
        if not isinstance(data, dict):
            raise serializers.ValidationError("Μη έγκυρα δεδομένα κάλυψης")

        online = bool(data.get("online"))
        onbase = bool(data.get("onbase"))
        onsite = bool(data.get("onsite"))

        # OLD refine #1: at least one mode (profile.ts:123-132).
        if not (online or onbase or onsite):
            raise serializers.ValidationError("Επιλέξτε τουλάχιστον έναν τρόπο εργασίας")

        # OLD refine #2: onbase → address + zipcode + area + county required
        # (profile.ts:133-154).
        if onbase:
            for key in ("address", "zipcode", "area", "county"):
                v = data.get(key)
                if not (isinstance(v, str) and v.strip()):
                    raise serializers.ValidationError(
                        "Πληκτρολογήστε τη Διεύθυνση και τον Τ.Κ. του χώρου σας."
                    )

        # OLD refine #3: onsite → counties array ≥ 1 (profile.ts:155-167).
        if onsite:
            counties = data.get("counties")
            if not (isinstance(counties, list) and len(counties) > 0):
                raise serializers.ValidationError(
                    "Επιλέξτε τουλάχιστον έναν νομό που εξυπηρετείτε"
                )
        return data


# ----- portfolio -----------------------------------------------------------


class UpdatePortfolioSerializer(serializers.Serializer):
    """Mirrors OLD `updateProfilePortfolioSchema` (profile.ts:303-309)."""

    portfolio = serializers.ListField(
        child=serializers.JSONField(),
        allow_empty=True,
        required=False,
        allow_null=True,
    )

    def validate_portfolio(self, value):
        # OLD: .max(10, 'Μπορείτε να ανεβάσετε έως 10 αρχεία').
        if value and len(value) > 10:
            raise serializers.ValidationError("Μπορείτε να ανεβάσετε έως 10 αρχεία")
        return value


# ----- presentation --------------------------------------------------------


class UpdatePresentationSerializer(serializers.Serializer):
    """Mirrors OLD `profilePresentationUpdateSchema` (profile.ts:502-515).

    IMPORTANT: the action uses the UPDATE schema, where phone/viber/whatsapp
    are lenient (`string optional`) — the 10-12 digit regex lives only in the
    form-level `presentationSchema`, which the server action does NOT use. So
    we replicate the lenient rule here. website is url-or-empty; socials are
    per-platform URLs (socialMediaSchema, profile.ts:226-293).
    """

    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=64)
    website = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    viber = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=64)
    whatsapp = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=64)
    visibility = serializers.JSONField(required=False, allow_null=True)
    socials = serializers.JSONField(required=False, allow_null=True)

    # OLD socialMediaSchema validates each platform as a URL or ''
    _SOCIAL_PLATFORMS = (
        "facebook", "linkedin", "x", "youtube", "github", "instagram",
        "behance", "dribbble", "pinterest", "vimeo", "tiktok",
    )

    def validate_website(self, value):
        # OLD: z.string().url().or(z.literal('')) optional.
        if value in (None, ""):
            return value
        if not re.match(r"^https?://", value):
            raise serializers.ValidationError("Enter a valid website")
        return value

    def validate_socials(self, value):
        if not value:
            return value
        if not isinstance(value, dict):
            raise serializers.ValidationError("Μη έγκυρα δεδομένα κοινωνικών δικτύων")
        for platform in self._SOCIAL_PLATFORMS:
            url = value.get(platform)
            if url in (None, ""):
                continue
            if not re.match(r"^https?://", str(url)):
                raise serializers.ValidationError({platform: "Εισάγετε έγκυρο URL"})
        return value


# ----- report --------------------------------------------------------------


class ReportProfileSerializer(serializers.Serializer):
    """Mirrors OLD `reportProfileSchema` (profile.ts:622-630)."""

    profileName = serializers.CharField(max_length=255)
    profileUsername = serializers.CharField(max_length=255)
    description = serializers.CharField(min_length=10, max_length=500)


# ----- verification --------------------------------------------------------


class SubmitVerificationSerializer(serializers.Serializer):
    """Mirrors OLD `verificationFormSchema` (profile.ts:427-444).

    OLD afm is min(1)/max(20) chars (NOT strict 9-digit); name min(2)/max(100);
    address min(5)/max(200); phone min(1)/max(50).
    """

    afm = serializers.CharField(min_length=1, max_length=20)
    name = serializers.CharField(min_length=2, max_length=100)
    address = serializers.CharField(min_length=5, max_length=200)
    phone = serializers.CharField(min_length=1, max_length=50)


# ----- AFM lookup ----------------------------------------------------------


class LookupAfmSerializer(serializers.Serializer):
    """Mirrors OLD `lookupAfm` arg validation (lookup-afm.ts:28): exactly 9 digits."""

    afm = serializers.RegexField(regex=r"^\d{9}$")
