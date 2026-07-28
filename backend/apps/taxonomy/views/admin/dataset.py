"""Admin skill / tag / taxonomy CRUD endpoints (rows 223-234)."""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from django.core.cache import cache
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions.admin import AdminResource, HasResourcePermission
from apps.taxonomy.serializers.taxonomy import (
    CommitChangesSerializer,
    ProTaxonomySerializer,
    ServiceTaxonomySerializer,
    SkillSerializer,
    TagSerializer,
)
from apps.taxonomy.services import dataset_ops

_PERM = HasResourcePermission(AdminResource.TAXONOMIES, "edit")


# ----- Skills (rows 223, 224, 225) ----------------------------------------


class AdminSkillCreateView(APIView):
    permission_classes = [IsAuthenticated, _PERM]

    @extend_schema(request=SkillSerializer)
    def post(self, request):
        s = SkillSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(dataset_ops.create_skill(**s.validated_data))


class AdminSkillUpdateDeleteView(APIView):
    permission_classes = [IsAuthenticated, _PERM]

    @extend_schema(request=SkillSerializer)
    def patch(self, request, item_id):
        s = SkillSerializer(data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        return Response(dataset_ops.update_skill(id=item_id, **s.validated_data))

    def delete(self, request, item_id):
        return Response(dataset_ops.delete_skill(id=item_id))


# ----- Tags (rows 226, 227, 228) ------------------------------------------


class AdminTagCreateView(APIView):
    permission_classes = [IsAuthenticated, _PERM]

    @extend_schema(request=TagSerializer)
    def post(self, request):
        s = TagSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(dataset_ops.create_tag(**s.validated_data))


class AdminTagUpdateDeleteView(APIView):
    permission_classes = [IsAuthenticated, _PERM]

    @extend_schema(request=TagSerializer)
    def patch(self, request, item_id):
        s = TagSerializer(data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        return Response(dataset_ops.update_tag(id=item_id, **s.validated_data))

    def delete(self, request, item_id):
        return Response(dataset_ops.delete_tag(id=item_id))


# ----- Service / Pro Taxonomies (rows 229-232) ----------------------------


class AdminServiceTaxonomyCreateView(APIView):
    permission_classes = [IsAuthenticated, _PERM]

    @extend_schema(request=ServiceTaxonomySerializer)
    def post(self, request):
        s = ServiceTaxonomySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(dataset_ops.create_taxonomy_item(kind="service", payload=s.validated_data))


class AdminServiceTaxonomyUpdateView(APIView):
    permission_classes = [IsAuthenticated, _PERM]

    @extend_schema(request=ServiceTaxonomySerializer)
    def patch(self, request, item_id):
        s = ServiceTaxonomySerializer(data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        return Response(dataset_ops.update_taxonomy_item(kind="service", id=item_id, payload=s.validated_data))

    def delete(self, request, item_id):
        return Response(dataset_ops.delete_taxonomy_item(kind="service", id=item_id))


class AdminProTaxonomyCreateView(APIView):
    permission_classes = [IsAuthenticated, _PERM]

    @extend_schema(request=ProTaxonomySerializer)
    def post(self, request):
        s = ProTaxonomySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(dataset_ops.create_taxonomy_item(kind="pro", payload=s.validated_data))


class AdminProTaxonomyUpdateView(APIView):
    permission_classes = [IsAuthenticated, _PERM]

    @extend_schema(request=ProTaxonomySerializer)
    def patch(self, request, item_id):
        s = ProTaxonomySerializer(data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        return Response(dataset_ops.update_taxonomy_item(kind="pro", id=item_id, payload=s.validated_data))

    def delete(self, request, item_id):
        return Response(dataset_ops.delete_taxonomy_item(kind="pro", id=item_id))


class AdminCommitChangesView(APIView):
    """POST /api/admin/taxonomies/commit (row 233) — multi-change single commit."""

    permission_classes = [IsAuthenticated, _PERM]

    @extend_schema(request=CommitChangesSerializer)
    def post(self, request):
        s = CommitChangesSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(dataset_ops.commit_multiple_changes(
            changes=s.validated_data["changes"],
            overall_message=s.validated_data["overallMessage"],
        ))


class AdminRevalidateTaxonomyCachesView(APIView):
    """POST /api/admin/taxonomies/revalidate (row 234) — purge taxonomy caches."""

    permission_classes = [IsAuthenticated, _PERM]

    def post(self, request):
        # Clear known cache prefixes used by the profiles/services apps.
        # django-redis supports glob deletes; delete_many with literal '*'
        # keys was a silent no-op.
        prefixes = ("profiles:directory:", "profiles:count:", "profile:page:")
        purged = []
        for prefix in prefixes:
            try:
                cache.delete_pattern(f"{prefix}*")
                purged.append(prefix)
            except AttributeError:  # non-redis backend (tests)
                break
        return Response({"message": "Taxonomy caches purged", "revalidated": purged})
