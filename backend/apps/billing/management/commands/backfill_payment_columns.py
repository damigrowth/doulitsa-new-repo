"""Backfill/refresh denormalized payment columns on Subscription from captured attempts.

Migrated (pre-Django) subscription rows can have NULL last_payment_at /
first_payment_at and zero payment_count / total_paid_lifetime even though
their subscription_payment_attempts exist — the user dashboard (which lists
attempts) then shows payments while the admin (which reads the columns)
shows nothing — or STALE columns (a payment recorded an attempt without
updating the subscription). This makes the columns match the attempts.
Idempotent; only ever moves values forward (newer last / earlier first /
higher counts), never backwards.

Usage: python manage.py backfill_payment_columns [--dry-run]
"""
from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db.models import Count, Max, Min, Sum

from apps.billing.models import Subscription, SubscriptionPaymentAttempt


class Command(BaseCommand):
    help = "Fill NULL payment columns on subscriptions from their CAPTURED attempts"

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **opts):
        aggs = (
            SubscriptionPaymentAttempt.objects
            .filter(status__iexact="captured")
            .values("subscription_id")
            .annotate(last=Max("created_at"), first=Min("created_at"),
                      n=Count("id"), total=Sum("amount"))
        )
        by_sub = {r["subscription_id"]: r for r in aggs}
        fixed = 0
        for sub in Subscription.objects.filter(id__in=by_sub.keys()):
            fb = by_sub[sub.id]
            updates = []
            if fb["last"] and (sub.last_payment_at is None or fb["last"] > sub.last_payment_at):
                sub.last_payment_at = fb["last"]; updates.append("last_payment_at")
            if fb["first"] and (sub.first_payment_at is None or fb["first"] < sub.first_payment_at):
                sub.first_payment_at = fb["first"]; updates.append("first_payment_at")
            if fb["n"] and fb["n"] > (sub.payment_count or 0):
                sub.payment_count = fb["n"]; updates.append("payment_count")
            if fb["total"] and fb["total"] > (sub.total_paid_lifetime or 0):
                sub.total_paid_lifetime = fb["total"]; updates.append("total_paid_lifetime")
            if updates:
                fixed += 1
                self.stdout.write(f"{sub.id}: {', '.join(updates)}")
                if not opts["dry_run"]:
                    sub.save(update_fields=updates + ["updated_at"])
        self.stdout.write(self.style.SUCCESS(
            f"{'Would fix' if opts['dry_run'] else 'Fixed'} {fixed} subscription(s)"))
