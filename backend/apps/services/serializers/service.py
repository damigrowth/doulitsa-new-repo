"""Service serializers.

Validation here mirrors OLD `lib/validations/service.ts` (`createServiceSchema`,
`updateServiceInfoSchema`, `serviceMediaUploadSchema`) field-for-field, including
the Greek error messages, so client-visible validation behaviour is identical.
"""
from __future__ import annotations

import re

from rest_framework import serializers


def _strip_html_tags(html: str | None) -> str:
    """Mirror OLD `stripHtmlTags` (utils/text/html.ts:43-45):
    `html.replace(/<[^>]*>/g, '').trim()`."""
    if not html:
        return ""
    return re.sub(r"<[^>]*>", "", html).strip()


class ServiceTypeField(serializers.Serializer):
    online = serializers.BooleanField(required=False, default=False)
    presence = serializers.BooleanField(required=False, default=False)
    oneoff = serializers.BooleanField(required=False, default=False)
    onbase = serializers.BooleanField(required=False, default=False)
    subscription = serializers.BooleanField(required=False, default=False)
    onsite = serializers.BooleanField(required=False, default=False)


_SUB_TYPES = ("month", "year", "per_case", "per_hour", "per_session")


# =============================================================================
# Addon / FAQ sub-serializers (formServiceAddonSchema / formServiceFaqSchema)
# =============================================================================


class ServiceAddonSerializer(serializers.Serializer):
    """OLD `formServiceAddonSchema` (validations/service.ts:25-44)."""

    title = serializers.CharField(
        min_length=5,
        max_length=100,
        error_messages={
            "min_length": "Ο τίτλος της extra υπηρεσίας πρέπει να είναι τουλάχιστον 5 χαρακτήρες",
            "max_length": "Ο τίτλος δεν μπορεί να ξεπερνά τους 100 χαρακτήρες",
        },
    )
    description = serializers.CharField(
        min_length=10,
        max_length=500,
        error_messages={
            "min_length": "Η περιγραφή της extra υπηρεσίας πρέπει να είναι τουλάχιστον 10 χαρακτήρες",
            "max_length": "Η περιγραφή δεν μπορεί να ξεπερνά τους 500 χαρακτήρες",
        },
    )
    price = serializers.FloatField(
        min_value=5,
        max_value=5000,
        error_messages={
            "min_value": "Η ελάχιστη τιμή είναι 5€",
            "max_value": "Η μέγιστη τιμή είναι 5.000€",
        },
    )


class ServiceFaqSerializer(serializers.Serializer):
    """OLD `formServiceFaqSchema` (validations/service.ts:46-55)."""

    question = serializers.CharField(
        min_length=10,
        max_length=200,
        error_messages={
            "min_length": "Η ερώτηση πρέπει να είναι τουλάχιστον 10 χαρακτήρες",
            "max_length": "Η ερώτηση δεν μπορεί να ξεπερνά τους 200 χαρακτήρες",
        },
    )
    answer = serializers.CharField(
        min_length=2,
        max_length=1000,
        error_messages={
            "min_length": "Η απάντηση πρέπει να είναι τουλάχιστον 2 χαρακτήρες",
            "max_length": "Η απάντηση δεν μπορεί να ξεπερνά τους 1000 χαρακτήρες",
        },
    )


def _validate_unique_addons(addons: list[dict]) -> None:
    """OLD createServiceSchema addons.superRefine (validations/service.ts:1082-1145):
    unique titles, unique descriptions, each price >= 5€."""
    if not addons:
        return
    errors: dict = {}
    titles = [str(a.get("title", "")).lower().strip() for a in addons]
    descriptions = [str(a.get("description", "")).lower().strip() for a in addons]
    for idx, t in enumerate(titles):
        if titles.count(t) > 1:
            errors.setdefault(idx, {})["title"] = [
                "Οι τίτλοι των extra υπηρεσιών πρέπει να είναι μοναδικοί"
            ]
    for idx, d in enumerate(descriptions):
        if descriptions.count(d) > 1:
            errors.setdefault(idx, {})["description"] = [
                "Οι περιγραφές των extra υπηρεσιών πρέπει να είναι μοναδικές"
            ]
    for idx, a in enumerate(addons):
        if (a.get("price") or 0) < 5:
            errors.setdefault(idx, {})["price"] = ["Η ελάχιστη τιμή είναι 5€"]
    if errors:
        raise serializers.ValidationError({"addons": errors})


def _validate_unique_faq(faqs: list[dict]) -> None:
    """OLD createServiceSchema faq.superRefine (validations/service.ts:1146-1197):
    unique questions, unique answers."""
    if not faqs:
        return
    errors: dict = {}
    questions = [str(f.get("question", "")).lower().strip() for f in faqs]
    answers = [str(f.get("answer", "")).lower().strip() for f in faqs]
    for idx, q in enumerate(questions):
        if questions.count(q) > 1:
            errors.setdefault(idx, {})["question"] = ["Οι ερωτήσεις πρέπει να είναι μοναδικές"]
    for idx, a in enumerate(answers):
        if answers.count(a) > 1:
            errors.setdefault(idx, {})["answer"] = ["Οι απαντήσεις πρέπει να είναι μοναδικές"]
    if errors:
        raise serializers.ValidationError({"faq": errors})


class CreateServiceSerializer(serializers.Serializer):
    """Mirrors OLD `createServiceSchema` (validations/service.ts:1034-1282)."""

    title = serializers.CharField(
        min_length=10,
        max_length=100,
        error_messages={
            "min_length": "Ο τίτλος πρέπει να είναι τουλάχιστον 10 χαρακτήρες",
            "max_length": "Ο τίτλος δεν μπορεί να ξεπερνά τους 100 χαρακτήρες",
        },
    )
    description = serializers.CharField()
    category = serializers.CharField(max_length=64, error_messages={"blank": "Η κατηγορία είναι υποχρεωτική"})
    subcategory = serializers.CharField(max_length=64, error_messages={"blank": "Η υποκατηγορία είναι υποχρεωτική"})
    subdivision = serializers.CharField(max_length=64, error_messages={"blank": "Η κατηγορία είναι υποχρεωτική"})
    tags = serializers.ListField(
        child=serializers.CharField(max_length=64),
        required=False,
        max_length=10,
        error_messages={"max_length": "Μπορείτε να επιλέξετε έως 10 ετικέτες (tags)"},
    )
    fixed = serializers.BooleanField()
    price = serializers.IntegerField(
        required=False,
        max_value=10000,
        error_messages={"max_value": "Η τιμή δεν μπορεί να ξεπερνά τα 10.000€"},
    )
    duration = serializers.IntegerField(
        required=False,
        min_value=0,
        max_value=365,
        error_messages={
            "min_value": "Η διάρκεια δεν μπορεί να είναι αρνητική",
            "max_value": "Η διάρκεια δεν μπορεί να ξεπερνά τις 365 ημέρες",
        },
    )
    type = serializers.JSONField(required=False, default=dict)
    subscriptionType = serializers.ChoiceField(choices=_SUB_TYPES, required=False, allow_null=True)
    addons = ServiceAddonSerializer(
        many=True,
        required=False,
        max_length=3,
        error_messages={"max_length": "Μπορείτε να προσθέσετε έως 3 extra υπηρεσίες"},
    )
    faq = ServiceFaqSerializer(
        many=True,
        required=False,
        max_length=5,
        error_messages={"max_length": "Μπορείτε να προσθέσετε έως 5 συχνές ερωτήσεις"},
    )
    media = serializers.ListField(
        child=serializers.JSONField(),
        required=False,
        allow_null=True,
        max_length=10,
        error_messages={"max_length": "Μπορείτε να ανεβάσετε έως 10 αρχεία"},
    )

    def validate_description(self, value):
        # OLD validates the stripped-HTML length (validations/service.ts:1049-1056).
        stripped = _strip_html_tags(value)
        if len(stripped) < 80:
            raise serializers.ValidationError("Η περιγραφή πρέπει να είναι τουλάχιστον 80 χαρακτήρες")
        if len(stripped) > 5000:
            raise serializers.ValidationError("Η περιγραφή δεν μπορεί να ξεπερνά τους 5000 χαρακτήρες")
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        type_cfg = attrs.get("type") or {}

        def _t(key):
            return bool(type_cfg.get(key)) if isinstance(type_cfg, dict) else False

        # At least one service type (validations/service.ts:1206-1217).
        if not (_t("presence") or _t("online")):
            raise serializers.ValidationError({"type": ["Επιλέξτε τουλάχιστον έναν τύπο υπηρεσίας"]})
        # Presence -> onbase|onsite (1218-1230).
        if _t("presence") and not (_t("onbase") or _t("onsite")):
            raise serializers.ValidationError(
                {"type": ["Επιλέξτε τόπο παροχής για υπηρεσίες φυσικής παρουσίας"]}
            )
        # Online -> oneoff|subscription (1231-1243).
        if _t("online") and not (_t("oneoff") or _t("subscription")):
            raise serializers.ValidationError(
                {"type": ["Επιλέξτε τύπο παράδοσης για online υπηρεσίες"]}
            )
        # Subscription -> subscriptionType (1244-1256).
        if _t("subscription") and attrs.get("subscriptionType") is None:
            raise serializers.ValidationError({"subscriptionType": ["Επιλέξτε περίοδο συνδρομής"]})
        # fixed -> price required & >= 5 (1257-1282).
        fixed = attrs.get("fixed")
        price = attrs.get("price")
        if fixed and not price:
            raise serializers.ValidationError({"price": ["Πληκτρολογήστε τιμή"]})
        if fixed and price is not None and price < 5:
            raise serializers.ValidationError({"price": ["Η τιμή πρέπει να είναι τουλάχιστον 5€"]})

        _validate_unique_addons(attrs.get("addons") or [])
        _validate_unique_faq(attrs.get("faq") or [])
        return attrs


class UpdateServiceSerializer(CreateServiceSerializer):
    """Mirrors OLD `updateServiceInfoSchema` (validations/service.ts:1491-1626):
    all fields optional for PATCH; type refinements skip when `type` is absent."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Make every field optional (partial update). createServiceSchema fields
        # are required; updateServiceInfoSchema makes them `.optional()`.
        for field in self.fields.values():
            field.required = False

    def validate_description(self, value):
        # updateServiceInfoSchema only enforces the <= 5000 upper bound on
        # update (no min-80 floor): validations/service.ts:1505-1515.
        stripped = _strip_html_tags(value)
        if len(stripped) > 5000:
            raise serializers.ValidationError("Η περιγραφή δεν μπορεί να ξεπερνά τους 5000 χαρακτήρες")
        return value

    def validate(self, attrs):
        # Skip the create-only "at least one type / required fields" gates; only
        # apply the conditional refinements that OLD keeps on partial update.
        type_cfg = attrs.get("type")
        if type_cfg is not None and isinstance(type_cfg, dict):
            def _t(key):
                return bool(type_cfg.get(key))

            if not (_t("presence") or _t("online")):
                raise serializers.ValidationError({"type": ["Επιλέξτε τουλάχιστον έναν τύπο υπηρεσίας"]})
            if _t("presence") and not (_t("onbase") or _t("onsite")):
                raise serializers.ValidationError(
                    {"type": ["Επιλέξτε τόπο παροχής για υπηρεσίες φυσικής παρουσίας"]}
                )
            if _t("online") and not (_t("oneoff") or _t("subscription")):
                raise serializers.ValidationError(
                    {"type": ["Επιλέξτε τύπο παράδοσης για online υπηρεσίες"]}
                )
            if _t("subscription") and attrs.get("subscriptionType") is None:
                raise serializers.ValidationError({"subscriptionType": ["Επιλέξτε περίοδο συνδρομής"]})

        fixed = attrs.get("fixed")
        price = attrs.get("price")
        if fixed and not price:
            raise serializers.ValidationError({"price": ["Πληκτρολογήστε τιμή"]})
        if fixed and price is not None and price < 5:
            raise serializers.ValidationError({"price": ["Η τιμή πρέπει να είναι τουλάχιστον 5€"]})

        _validate_unique_addons(attrs.get("addons") or [])
        _validate_unique_faq(attrs.get("faq") or [])
        return attrs

    def to_internal_value(self, data):
        data = super().to_internal_value(data)
        return {k: v for k, v in data.items() if v is not None}


class DraftServiceAddonSerializer(serializers.Serializer):
    """OLD `draftServiceAddonSchema` (validations/service.ts:58-72): relaxed."""

    title = serializers.CharField(
        max_length=100, required=False, allow_blank=True,
        error_messages={"max_length": "Ο τίτλος δεν μπορεί να ξεπερνά τους 100 χαρακτήρες"},
    )
    description = serializers.CharField(
        max_length=500, required=False, allow_blank=True,
        error_messages={"max_length": "Η περιγραφή δεν μπορεί να ξεπερνά τους 500 χαρακτήρες"},
    )
    price = serializers.FloatField(
        min_value=0, max_value=5000, required=False,
        error_messages={
            "min_value": "Η τιμή δεν μπορεί να είναι αρνητική",
            "max_value": "Η τιμή δεν μπορεί να ξεπερνά τα 5.000€",
        },
    )


class DraftServiceFaqSerializer(serializers.Serializer):
    """OLD `draftServiceFaqSchema` (validations/service.ts:74-83): relaxed."""

    question = serializers.CharField(
        max_length=200, required=False, allow_blank=True,
        error_messages={"max_length": "Η ερώτηση δεν μπορεί να ξεπερνά τους 200 χαρακτήρες"},
    )
    answer = serializers.CharField(
        max_length=1000, required=False, allow_blank=True,
        error_messages={"max_length": "Η απάντηση δεν μπορεί να ξεπερνά τους 1000 χαρακτήρες"},
    )


class DraftServiceSerializer(serializers.Serializer):
    """Mirrors OLD `createServiceDraftSchema` (validations/service.ts:1285-1385):
    all fields optional, no type/price refinements, relaxed addon/faq."""

    title = serializers.CharField(
        max_length=100, required=False, allow_blank=True,
        error_messages={"max_length": "Ο τίτλος δεν μπορεί να ξεπερνά τους 100 χαρακτήρες"},
    )
    description = serializers.CharField(required=False, allow_blank=True)
    category = serializers.CharField(max_length=64, required=False, allow_blank=True)
    subcategory = serializers.CharField(max_length=64, required=False, allow_blank=True)
    subdivision = serializers.CharField(max_length=64, required=False, allow_blank=True)
    tags = serializers.ListField(
        child=serializers.CharField(max_length=64), required=False, max_length=10,
        error_messages={"max_length": "Μπορείτε να επιλέξετε έως 10 ετικέτες (tags)"},
    )
    fixed = serializers.BooleanField(required=False)
    price = serializers.IntegerField(
        required=False, min_value=0, max_value=10000,
        error_messages={
            "min_value": "Η τιμή δεν μπορεί να είναι αρνητική",
            "max_value": "Η τιμή δεν μπορεί να ξεπερνά τα 10.000€",
        },
    )
    duration = serializers.IntegerField(
        required=False, min_value=1, max_value=365,
        error_messages={
            "min_value": "Η διάρκεια πρέπει να είναι τουλάχιστον 1 ημέρα",
            "max_value": "Η διάρκεια δεν μπορεί να ξεπερνά τις 365 ημέρες",
        },
    )
    type = serializers.JSONField(required=False, default=dict)
    subscriptionType = serializers.ChoiceField(choices=_SUB_TYPES, required=False, allow_null=True)
    addons = DraftServiceAddonSerializer(
        many=True, required=False, max_length=3,
        error_messages={"max_length": "Μπορείτε να προσθέσετε έως 3 extra υπηρεσίες"},
    )
    faq = DraftServiceFaqSerializer(
        many=True, required=False, max_length=5,
        error_messages={"max_length": "Μπορείτε να προσθέσετε έως 5 συχνές ερωτήσεις"},
    )
    media = serializers.ListField(
        child=serializers.JSONField(), required=False, allow_null=True, max_length=10,
        error_messages={"max_length": "Μπορείτε να ανεβάσετε έως 10 αρχεία"},
    )

    def validate_description(self, value):
        # Draft only enforces the upper bound (validations/service.ts:1299-1305).
        if len(_strip_html_tags(value)) > 5000:
            raise serializers.ValidationError("Η περιγραφή δεν μπορεί να ξεπερνά τους 5000 χαρακτήρες")
        return value

    def validate(self, attrs):
        # Draft uniqueness is array-level (not field-level) but the messages match
        # (validations/service.ts:1332-1377).
        addons = attrs.get("addons") or []
        if addons:
            titles = [str(a.get("title", "")).lower().strip() for a in addons]
            descriptions = [str(a.get("description", "")).lower().strip() for a in addons]
            if len(set(titles)) != len(titles):
                raise serializers.ValidationError(
                    {"addons": ["Οι τίτλοι των extra υπηρεσιών πρέπει να είναι μοναδικοί"]}
                )
            if len(set(descriptions)) != len(descriptions):
                raise serializers.ValidationError(
                    {"addons": ["Οι περιγραφές των extra υπηρεσιών πρέπει να είναι μοναδικές"]}
                )
        faqs = attrs.get("faq") or []
        if faqs:
            questions = [str(f.get("question", "")).lower().strip() for f in faqs]
            answers = [str(f.get("answer", "")).lower().strip() for f in faqs]
            if len(set(questions)) != len(questions):
                raise serializers.ValidationError({"faq": ["Οι ερωτήσεις πρέπει να είναι μοναδικές"]})
            if len(set(answers)) != len(answers):
                raise serializers.ValidationError({"faq": ["Οι απαντήσεις πρέπει να είναι μοναδικές"]})
        return attrs

    def to_internal_value(self, data):
        data = super().to_internal_value(data)
        return {k: v for k, v in data.items() if v is not None}


class UpdateServiceMediaSerializer(serializers.Serializer):
    # OLD `updateServiceMediaSchema` caps media at 10 (validations/service.ts:1480-1486).
    media = serializers.ListField(
        child=serializers.JSONField(),
        max_length=10,
        error_messages={"max_length": "Μπορείτε να ανεβάσετε έως 10 αρχεία"},
    )


class ServiceFiltersSerializer(serializers.Serializer):
    category = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=64)
    subcategory = serializers.JSONField(required=False, allow_null=True)
    subdivision = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=64)
    county = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=64)
    # JSONField, not BooleanField: DRF's BooleanField coerces '' to None, but
    # the archive UI sends a bare `?online` ('' value) that OLD treated as TRUE
    # (get-services.ts:922). The selector interprets ''/true/'true' itself.
    online = serializers.JSONField(required=False, allow_null=True)
    search = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=255)
    # OLD allowed an explicit status override on archive search (default
    # 'published'); keep it accepted (get-services.ts:392).
    status = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=16)
    page = serializers.IntegerField(required=False, default=1, min_value=1)
    limit = serializers.IntegerField(required=False, default=20, min_value=1, max_value=100)
    sortBy = serializers.ChoiceField(
        # OLD also accepted the `default` keyword (isValidArchiveSortBy).
        choices=("recent", "oldest", "price_asc", "price_desc",
                 "rating_high", "rating_low", "popular", "default"),
        required=False, allow_null=True, allow_blank=True,
    )
    excludeFeatured = serializers.BooleanField(required=False, default=False)


class ServiceArchiveRequestSerializer(serializers.Serializer):
    categorySlug = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    subcategorySlug = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    subdivisionSlug = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    limit = serializers.IntegerField(required=False, default=20, min_value=1, max_value=100)
    searchParams = serializers.JSONField(required=False, default=dict)


class ReportServiceSerializer(serializers.Serializer):
    serviceTitle = serializers.CharField(max_length=512)
    serviceSlug = serializers.CharField(max_length=255)
    description = serializers.CharField(min_length=10, max_length=4000)
