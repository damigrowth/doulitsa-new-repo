"""Admin notifications feed.

There's no persistent `Notification` table — every event of interest already
lives in another model (verifications, submissions, reports, registrations,
etc.). We aggregate the most recent items from each source into a single
paginated feed shaped for the admin UI.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions.admin import AdminResource, HasResourcePermission


_VIEW = HasResourcePermission(AdminResource.DASHBOARD, "view")


def _iso(dt) -> str | None:
    if dt is None:
        return None
    return dt.isoformat()


def _humanize(delta: timedelta) -> str:
    secs = int(delta.total_seconds())
    if secs < 60:
        return "μόλις τώρα"
    if secs < 3600:
        return f"πριν {secs // 60} λεπτά"
    if secs < 86_400:
        return f"πριν {secs // 3600} ώρες"
    days = secs // 86_400
    if days < 30:
        return f"πριν {days} ημέρες"
    return f"πριν {days // 30} μήνες"


def _build_feed() -> list[dict[str, Any]]:
    now = datetime.now(timezone.utc)
    out: list[dict[str, Any]] = []

    # Recently registered users
    try:
        from apps.accounts.models import User
        for u in User.objects.order_by("-created_at")[:5]:
            created = getattr(u, "created_at", None)
            out.append({
                "id": f"user:{u.id}",
                "type": "user",
                "title": "Νέα εγγραφή χρήστη",
                "message": f"{u.display_name or u.name or u.email} εγγράφηκε στην πλατφόρμα",
                "createdAt": _iso(created),
                "time": _humanize(now - created) if created else "—",
                "priority": "medium",
                "status": "unread",
                "href": f"/admin/users/{u.id}",
            })
    except Exception:
        pass

    # Pending taxonomy submissions
    try:
        from apps.taxonomy.models import TaxonomySubmission
        for s in TaxonomySubmission.objects.filter(status="pending").order_by("-created_at")[:10]:
            created = getattr(s, "created_at", None)
            out.append({
                "id": f"taxonomy:{s.id}",
                "type": "taxonomy",
                "title": "Εκκρεμής υποβολή ταξινομίας",
                "message": f"{s.type}: {s.label or s.id}",
                "createdAt": _iso(created),
                "time": _humanize(now - created) if created else "—",
                "priority": "medium",
                "status": "unread",
                "href": "/admin/taxonomies/submissions",
            })
    except Exception:
        pass

    # Pending profile verifications
    try:
        from apps.profiles.models import ProfileVerification
        for v in ProfileVerification.objects.filter(status="PENDING").order_by("-created_at")[:10]:
            created = getattr(v, "created_at", None)
            out.append({
                "id": f"verification:{v.id}",
                "type": "verification",
                "title": "Εκκρεμής επαλήθευση επαγγελματία",
                "message": f"{v.name or '—'} (ΑΦΜ {v.afm or '—'})",
                "createdAt": _iso(created),
                "time": _humanize(now - created) if created else "—",
                "priority": "high",
                "status": "unread",
                "href": f"/admin/verifications/{v.id}",
            })
    except Exception:
        pass

    # Pending services
    try:
        from apps.services.models import Service
        for s in Service.objects.filter(status="pending").order_by("-created_at")[:10]:
            created = getattr(s, "created_at", None)
            out.append({
                "id": f"service:{s.id}",
                "type": "service",
                "title": "Υπηρεσία προς έλεγχο",
                "message": s.title,
                "createdAt": _iso(created),
                "time": _humanize(now - created) if created else "—",
                "priority": "high",
                "status": "unread",
                "href": f"/admin/services/{s.id}",
            })
    except Exception:
        pass

    # Pending reviews
    try:
        from apps.reviews.models import Review
        for r in Review.objects.filter(status="PENDING").order_by("-created_at")[:10]:
            created = getattr(r, "created_at", None)
            out.append({
                "id": f"review:{r.id}",
                "type": "report",
                "title": "Αξιολόγηση προς έλεγχο",
                "message": (r.comment or "")[:120] or "Νέα αξιολόγηση",
                "createdAt": _iso(created),
                "time": _humanize(now - created) if created else "—",
                "priority": "high",
                "status": "unread",
                "href": f"/admin/reviews/{r.id}",
            })
    except Exception:
        pass

    # Sort newest first (None → end)
    out.sort(key=lambda x: x["createdAt"] or "", reverse=True)
    return out


class AdminNotificationsView(APIView):
    """GET /api/admin/notifications — aggregated event feed."""

    permission_classes = [IsAuthenticated, _VIEW]

    def get(self, request):
        feed = _build_feed()
        return Response({
            "notifications": feed,
            "total": len(feed),
            "unread": sum(1 for n in feed if n["status"] == "unread"),
            "highPriority": sum(1 for n in feed if n["priority"] == "high"),
        })
