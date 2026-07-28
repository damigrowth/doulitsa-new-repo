"""Blog article serializers.

Mirrors OLD Zod `createArticleSchema` / `updateArticleSchema`
(src/lib/validations/blog.ts:14-78). Field names, max/min lengths, the status
enum (draft/pending/published only), and the publish-time refinement all match OLD.
"""
from __future__ import annotations

from rest_framework import serializers

# OLD status enum is draft/pending/published only (blog.ts:31). Even though the
# Prisma `Status` model has more values, blog validation forbade them.
_STATUSES = ("draft", "pending", "published")


def _apply_publish_refinement(data: dict, *, errors: dict) -> None:
    """Mirror `articlePublishRefinement` (blog.ts:39-63).

    Skips strict checks for drafts; otherwise requires title>=5, content>=50,
    and a category. Messages match OLD verbatim.
    """
    status = data.get("status")
    if status == "draft":
        return

    title = data.get("title")
    if not title or len(title) < 5:
        errors.setdefault("title", []).append(
            "Ο τίτλος πρέπει να είναι τουλάχιστον 5 χαρακτήρες"
        )
    content = data.get("content")
    if not content or len(content) < 50:
        errors.setdefault("content", []).append(
            "Το περιεχόμενο πρέπει να είναι τουλάχιστον 50 χαρακτήρες"
        )
    if not data.get("categorySlug"):
        errors.setdefault("categorySlug", []).append(
            "Η κατηγορία είναι υποχρεωτική"
        )


class CreateArticleSerializer(serializers.Serializer):
    # title: max 200 at base (blog.ts:16); publish-time min 5 in refinement.
    title = serializers.CharField(
        max_length=200,
        error_messages={"max_length": "Ο τίτλος δεν μπορεί να ξεπερνά τους 200 χαρακτήρες"},
    )
    # slug: optional, max 300, "" allowed (blog.ts:17-21).
    slug = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=300)
    # excerpt: optional, max 500, "" allowed (blog.ts:22-26).
    excerpt = serializers.CharField(
        required=False, allow_blank=True, allow_null=True, max_length=500,
        error_messages={"max_length": "Η περίληψη δεν μπορεί να ξεπερνά τους 500 χαρακτήρες"},
    )
    # content: plain string at base (blog.ts:27); publish-time min 50 in refinement.
    content = serializers.CharField(allow_blank=True)
    coverImage = serializers.JSONField(required=False, allow_null=True)
    # categorySlug: optional, "" allowed (blog.ts:29).
    categorySlug = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=64)
    # authorProfileIds: the key the admin form actually submits (blog.ts:30; article-form.tsx:128,337).
    authorProfileIds = serializers.ListField(child=serializers.CharField(max_length=64), required=False)
    status = serializers.ChoiceField(choices=_STATUSES, required=False, default="draft")
    featured = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        # Always run the publish refinement on create (blog.ts:67).
        errors: dict = {}
        _apply_publish_refinement(attrs, errors=errors)
        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class UpdateArticleSerializer(CreateArticleSerializer):
    # Update = base.partial() + id (blog.ts:70-72): every field optional.
    title = serializers.CharField(
        required=False, max_length=200,
        error_messages={"max_length": "Ο τίτλος δεν μπορεί να ξεπερνά τους 200 χαρακτήρες"},
    )
    content = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=_STATUSES, required=False)

    def validate(self, attrs):
        # Only run publish refinement when status is being set to non-draft
        # (blog.ts:74-77).
        status = attrs.get("status")
        errors: dict = {}
        if status and status != "draft":
            _apply_publish_refinement(attrs, errors=errors)
        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def to_internal_value(self, data):
        data = super().to_internal_value(data)
        return {k: v for k, v in data.items() if v is not None}
