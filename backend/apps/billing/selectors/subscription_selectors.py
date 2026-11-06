"""Read selectors for the billing app.

Exposes `has_active_subscription(user)` because every feature gate in other
apps needs that test.
"""
from __future__ import annotations

from datetime import datetime, timezone

from django.db.models import Q

from apps.accounts.models import User
from apps.billing.models import Subscription, SubscriptionPlan, SubscriptionStatus


def has_active_subscription(user: User) -> bool:
    if not user or not user.is_authenticated:
        return False
    # A cancel_at_period_end sub whose paid period has passed is only still
    # "active" because the renewals task (which would downgrade it) is
    # disabled — treat it as expired at read time so feature gates don't keep
    # honoring a lapsed subscription.
    now = datetime.now(timezone.utc)
    return (
        Subscription.objects.filter(
            profile__user_id=user.id,
            status=SubscriptionStatus.ACTIVE,
            plan=SubscriptionPlan.PROMOTED,
        )
        .exclude(Q(cancel_at_period_end=True) & Q(current_period_end__lt=now))
        .exists()
    )
