"""Read selectors for the billing app.

Exposes `has_active_subscription(user)` because every feature gate in other
apps needs that test.
"""
from __future__ import annotations

from apps.accounts.models import User
from apps.billing.models import Subscription, SubscriptionPlan, SubscriptionStatus


def has_active_subscription(user: User) -> bool:
    if not user or not user.is_authenticated:
        return False
    return Subscription.objects.filter(
        profile__user_id=user.id,
        status=SubscriptionStatus.ACTIVE,
        plan=SubscriptionPlan.PROMOTED,
    ).exists()
