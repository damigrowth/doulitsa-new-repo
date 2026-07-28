"""Transactional email senders (Brevo via django-anymail).

Ported from the OLD app's `src/lib/email/**`. Each builder renders a subject +
HTML body and sends through the configured EMAIL_BACKEND
(`anymail.backends.sendinblue`). Sends are best-effort: if Brevo isn't configured
(no API key — e.g. local dev) or the provider errors, we log and return False so a
failed email NEVER breaks the request/transaction that triggered it.

Called from `apps.messaging.tasks` Celery tasks (so sends are async + retryable)
and tagged for Brevo statistics, mirroring OLD `EMAIL_TAGS`.
"""
from __future__ import annotations

import logging
import re

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)

# Brevo stat tags — ported from OLD src/lib/email/constants.ts EMAIL_TAGS
EMAIL_TAGS = {
    "EMAIL_VERIFICATION": "email-verification",
    "PASSWORD_RESET": "password-reset",
    "WELCOME": "welcome",
    "CONTACT_FORM_ADMIN": "contact-admin",
    "CONTACT_FORM_USER": "contact-confirmation",
    "VERIFICATION_REQUEST": "verification-request",
    "NEW_REVIEW": "new-review",
    "REVIEW_APPROVED": "review-approved",
    "ABUSE_REPORT": "abuse-report",
    "NEW_PROFILE": "new-profile",
    "SERVICE_CREATED": "service-created",
    "SERVICE_PUBLISHED": "service-published",
    "UNREAD_MESSAGES": "unread-messages",
    "SUBSCRIPTION_PAYMENT": "subscription-payment",
}

_TAG_RE = re.compile(r"<[^>]+>")


def _frontend(path: str) -> str:
    return f"{settings.FRONTEND_BASE_URL.rstrip('/')}{path}"


def _admin_email() -> str:
    # Where admin notifications go. Mirrors OLD `process.env.ADMIN_EMAIL ||
    # 'contact@doulitsa.gr'` (constants/email/email-config.ts), with the existing
    # ADMIN_NOTIFICATION_EMAIL / DEFAULT_FROM_EMAIL chain as the final fallback.
    return (
        getattr(settings, "ADMIN_NOTIFICATION_EMAIL", "")
        or getattr(settings, "ADMIN_EMAIL", "")
        or "contact@doulitsa.gr"
    )


def _configured() -> bool:
    return bool((getattr(settings, "ANYMAIL", {}) or {}).get("SENDINBLUE_API_KEY"))


def _layout(title: str, body_html: str) -> str:
    return (
        '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;'
        'color:#1f2937;line-height:1.5">'
        f'<h2 style="color:#122f5e">{title}</h2>'
        f"{body_html}"
        '<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">'
        '<p style="font-size:12px;color:#6b7280">Doulitsa · Αυτό το μήνυμα στάλθηκε αυτόματα.</p>'
        "</div>"
    )


def _button(href: str, label: str) -> str:
    return (
        f'<p style="margin:24px 0"><a href="{href}" '
        'style="background:#122f5e;color:#fff;text-decoration:none;padding:12px 20px;'
        'border-radius:8px;display:inline-block">'
        f"{label}</a></p>"
        f'<p style="font-size:13px;color:#6b7280">Ή αντίγραψε τον σύνδεσμο: <br>{href}</p>'
    )


def send_email(to, subject: str, html: str, *, tag: str | None = None, text: str | None = None) -> bool:
    """Send one transactional email. Best-effort; never raises to the caller."""
    if not to:
        return False
    if not _configured():
        logger.info("email skipped (Brevo not configured): to=%s subject=%s tag=%s", to, subject, tag)
        return False
    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text or _TAG_RE.sub("", html),
            to=[to] if isinstance(to, str) else list(to),
        )
        msg.attach_alternative(html, "text/html")
        if tag:
            msg.tags = [tag]  # anymail → Brevo tag for stats
        msg.send(fail_silently=False)
        return True
    except Exception:
        logger.exception("email send failed (subject=%s tag=%s)", subject, tag)
        return False


# --- Auth ------------------------------------------------------------------

def send_verification_email(*, email: str, token: str, display_name: str | None = None,
                            username: str | None = None) -> bool:
    name = display_name or username or ""
    url = _frontend(f"/api/verify-email?token={token}")
    html = _layout(
        "Επαλήθευση του email σου",
        f"<p>Γεια{(' ' + name) if name else ''}! Καλώς ήρθες στη Doulitsa.</p>"
        "<p>Πάτησε το κουμπί για να επαληθεύσεις τη διεύθυνση email σου:</p>"
        + _button(url, "Επαλήθευση email"),
    )
    return send_email(email, "Επαλήθευση του email σου — Doulitsa", html,
                      tag=EMAIL_TAGS["EMAIL_VERIFICATION"])


def send_password_reset_email(*, email: str, token: str, display_name: str | None = None) -> bool:
    name = display_name or ""
    url = _frontend(f"/reset-password?token={token}")
    html = _layout(
        "Επαναφορά κωδικού",
        f"<p>Γεια{(' ' + name) if name else ''},</p>"
        "<p>Λάβαμε αίτημα επαναφοράς του κωδικού σου. Πάτησε το κουμπί για να ορίσεις νέο κωδικό "
        "(ο σύνδεσμος λήγει σύντομα):</p>"
        + _button(url, "Επαναφορά κωδικού")
        + "<p style='font-size:13px;color:#6b7280'>Αν δεν ζήτησες εσύ την επαναφορά, αγνόησε αυτό το email.</p>",
    )
    return send_email(email, "Επαναφορά κωδικού — Doulitsa", html,
                      tag=EMAIL_TAGS["PASSWORD_RESET"])


def send_welcome_email(*, email: str, display_name: str | None = None, username: str | None = None) -> bool:
    name = display_name or username or ""
    url = _frontend("/dashboard")
    html = _layout(
        "Καλώς ήρθες στη Doulitsa!",
        f"<p>Γεια{(' ' + name) if name else ''}! Ο λογαριασμός σου είναι έτοιμος.</p>"
        + _button(url, "Στον πίνακά μου"),
    )
    return send_email(email, "Καλώς ήρθες στη Doulitsa", html, tag=EMAIL_TAGS["WELCOME"])


# --- Contact / support -----------------------------------------------------

def send_contact_admin_email(*, name: str, email: str, subject: str, message: str) -> bool:
    html = _layout(
        "Νέο μήνυμα επικοινωνίας",
        f"<p><b>Από:</b> {name} &lt;{email}&gt;</p><p><b>Θέμα:</b> {subject}</p>"
        f"<p><b>Μήνυμα:</b></p><p>{message}</p>",
    )
    return send_email(_admin_email(), f"[Doulitsa] Επικοινωνία: {subject}", html,
                      tag=EMAIL_TAGS["CONTACT_FORM_ADMIN"])


def send_contact_user_email(*, email: str, name: str | None = None) -> bool:
    html = _layout(
        "Λάβαμε το μήνυμά σου",
        f"<p>Γεια{(' ' + name) if name else ''}, ευχαριστούμε που επικοινώνησες μαζί μας. "
        "Θα σου απαντήσουμε το συντομότερο δυνατό.</p>",
    )
    return send_email(email, "Λάβαμε το μήνυμά σου — Doulitsa", html,
                      tag=EMAIL_TAGS["CONTACT_FORM_USER"])


def send_verification_request_admin_email(*, profile_id: str, afm: str | None = None) -> bool:
    html = _layout(
        "Νέο αίτημα επαλήθευσης",
        f"<p>Νέο αίτημα επαλήθευσης επαγγελματία.</p><p><b>Profile:</b> {profile_id}</p>"
        + (f"<p><b>ΑΦΜ:</b> {afm}</p>" if afm else ""),
    )
    return send_email(_admin_email(), "[Doulitsa] Νέο αίτημα επαλήθευσης", html,
                      tag=EMAIL_TAGS["VERIFICATION_REQUEST"])


# --- Reviews ---------------------------------------------------------------

def send_new_review_email(
    *,
    rating: int | None = None,
    review_id: str | None = None,
    author_email: str | None = None,
    receiver_name: str | None = None,
    receiver_email: str | None = None,
    comment: str | None = None,
    service_name: str | None = None,
) -> bool:
    """Notify the ADMIN that a new review is pending moderation.

    Ports `sendNewReviewEmail` (admin-emails.ts:366) + the NEW_REVIEW config
    (email-config.ts:201-209) and template (templates/new-review.ts): recipient
    is the admin (`_admin_email()`), subject is "Νέα Αξιολόγηση για {receiverName}",
    body shows from/to, a thumbs-up/down based on rating==5, optional comment +
    service, and links to the admin review pages. It does NOT email the owner.
    """
    receiver_name = receiver_name or ""
    sentiment = "&#128077; Θετική" if rating == 5 else "&#128078; Αρνητική"
    body = (
        (f"<p><b>Από:</b> {author_email}</p>" if author_email else "")
        + (f"<p><b>Πρός:</b> {receiver_email}</p>" if receiver_email else "")
        + f"<p><b>Αξιολόγηση:</b> {sentiment}</p>"
    )
    if comment:
        body += f'<p><b>Σχόλιο:</b> "{comment}"</p>'
    if service_name:
        body += f"<p><b>Υπηρεσία:</b> {service_name}</p>"
    if review_id:
        body += _button(_frontend(f"/admin/reviews/{review_id}"), "Προβολή Αξιολόγησης")
    body += (
        f'<p style="font-size:13px;color:#6b7280">'
        f'<a href="{_frontend("/admin/reviews")}">Διαχείριση Αξιολογήσεων</a></p>'
    )
    html = _layout(f"Νέα Αξιολόγηση για {receiver_name}", body)
    return send_email(
        _admin_email(),
        f"Νέα Αξιολόγηση για {receiver_name}",
        html,
        tag=EMAIL_TAGS["NEW_REVIEW"],
    )


def send_review_approved_email(
    *,
    email: str,
    rating: int | None = None,
    comment: str | None = None,
    service_name: str | None = None,
) -> bool:
    """Notify the PROFILE OWNER that a new approved review landed on their profile.

    Ports `sendReviewApprovedEmail` (review-emails.ts:17-76) + the REVIEW_APPROVED
    config (email-config.ts:211-219) and template (templates/review-approved.ts):
    recipient is the profile owner, subject is "Νέα Αξιολόγηση!", body tells the
    owner a new (positive/negative based on rating==5) approved review arrived and,
    when it has a comment, prompts them to make the comment publicly visible — with
    a link to /dashboard/reviews.
    """
    sentiment = "&#128077; θετική" if rating == 5 else "&#128078; αρνητική"
    body = f"<p>Έλαβες μία {sentiment} αξιολόγηση"
    if service_name:
        body += f" για την υπηρεσία <strong>{service_name}</strong>"
    body += ".</p>"
    if comment:
        body += (
            f'<p style="font-style:italic;color:#333">"{comment}"</p>'
            "<p>Συνδεθείτε στον λογαριασμό σας για να εγκρίνετε την αξιολόγηση "
            "ώστε να εμφανίζεται δημόσια!</p>"
        )
    body += _button(_frontend("/dashboard/reviews"), "Προβολή Αξιολογήσεων")
    html = _layout("Νέα Αξιολόγηση!", body)
    return send_email(email, "Νέα Αξιολόγηση!", html, tag=EMAIL_TAGS["REVIEW_APPROVED"])


# --- Profiles --------------------------------------------------------------

def send_new_profile_email(*, profile_id: str, profile_name: str, username: str,
                           user_email: str, user_type: str | None = None) -> bool:
    """Notify ADMIN that a new pro profile completed onboarding.

    Ports `sendNewProfileEmail` (admin-emails.ts:230-283): recipient is the
    admin, payload carries the profile name/username/id, the user's email/type
    and public + admin URLs. Tagged NEW_PROFILE for Brevo stats.
    """
    public_url = _frontend(f"/profile/{username}")
    admin_url = _frontend(f"/admin/profiles/{profile_id}")
    body = (
        f"<p><b>Όνομα:</b> {profile_name}</p>"
        f"<p><b>Username:</b> {username}</p>"
        f"<p><b>Email:</b> {user_email}</p>"
        + (f"<p><b>Τύπος:</b> {user_type}</p>" if user_type else "")
        + f"<p><b>Profile ID:</b> {profile_id}</p>"
        + _button(admin_url, "Προβολή στο Admin")
        + f'<p style="font-size:13px;color:#6b7280"><a href="{public_url}">Δημόσιο προφίλ</a></p>'
    )
    html = _layout("Νέο προφίλ επαγγελματία", body)
    return send_email(
        _admin_email(),
        f"Νέο προφίλ - {profile_name} - από {user_email}",
        html,
        tag=EMAIL_TAGS["NEW_PROFILE"],
    )


# --- Services --------------------------------------------------------------

def send_service_created_email(*, service_title: str, service_description: str,
                               service_id: str, creator_name: str, creator_email: str,
                               category: str | None = None) -> bool:
    """Notify ADMIN that a new (non-draft) service was submitted.

    Ports `sendServiceCreatedEmail` (service-emails.ts:19-94) + the SERVICE_CREATED
    config (email-config.ts:80-88): recipient is the admin, subject is
    "Νέα Υπηρεσία - {title} - από {creatorEmail}". Body ported from
    templates/service-created.ts.
    """
    admin_url = _frontend(f"/admin/services/{service_id}")
    body = (
        f'<h2 style="color:#122f5e">{service_title}</h2>'
        f"<p><b>Περιγραφή:</b><br>{service_description}</p>"
        "<hr style='border:none;border-top:1px solid #eee;margin:20px 0'>"
        f"<p><b>👤 Δημιουργός:</b><br>{creator_name} ({creator_email})</p>"
    )
    if category:
        body += f"<p><b>Κατηγορία:</b> {category}</p>"
    body += _button(admin_url, "Επεξεργασία Υπηρεσίας")
    html = _layout("Νέα Υπηρεσία", body)
    return send_email(
        _admin_email(),
        f"Νέα Υπηρεσία - {service_title} - από {creator_email}",
        html,
        tag=EMAIL_TAGS["SERVICE_CREATED"],
    )


def send_service_published_email(*, email: str, service_title: str, service_slug: str,
                                 service_id: str, user_name: str | None = None) -> bool:
    """Notify the service OWNER that their service is now live.

    Ports `sendServicePublishedEmail` (service-emails.ts:100-157) + the
    SERVICE_PUBLISHED config (email-config.ts:90-98): recipient is the owner,
    subject is `Η υπηρεσία σας "{title}" δημοσιεύτηκε!`. Body ported from
    templates/service-published.ts.
    """
    name = user_name or "φίλε"
    view_url = _frontend(f"/s/{service_slug}")
    edit_url = _frontend(f"/dashboard/services/edit/{service_id}")
    html = _layout(
        f"🎉 Συγχαρητήρια {name}!",
        f"<p>Η υπηρεσία <strong>{service_title}</strong> δημοσιεύτηκε με επιτυχία και "
        "είναι πλέον ορατή στην Doulitsa!</p>"
        "<p>Οι πελάτες μπορούν πλέον να την βρουν και να επικοινωνήσουν μαζί σου.</p>"
        + _button(view_url, "Προβολή Υπηρεσίας")
        + f'<p style="font-size:13px;color:#6b7280"><a href="{edit_url}">Επεξεργασία Υπηρεσίας</a></p>',
    )
    return send_email(
        email,
        f'Η υπηρεσία σας "{service_title}" δημοσιεύτηκε!',
        html,
        tag=EMAIL_TAGS["SERVICE_PUBLISHED"],
    )


# --- Messaging -------------------------------------------------------------

def send_unread_digest_email(*, email: str, user_name: str | None,
                             unread_count: int, previews: list[dict]) -> bool:
    """Send the unread-messages digest to a user.

    Ports `sendUnreadMessagesEmail` (message-emails.ts:17-84) + the
    UNREAD_MESSAGES template (templates/unread-messages.ts): subject reflects
    1 vs many, shows up to 15 previews oldest-first, and a "... και N ακόμη"
    overflow line. `previews` items are dicts with keys: sender, content, time.
    """
    name = user_name or "φίλε"
    title = "Νέο Μήνυμα" if unread_count == 1 else "Νέα Μηνύματα"
    count_label = "1 μήνυμα" if unread_count == 1 else f"{unread_count} μηνύματα"

    shown = list(previews[:15])
    rows = ""
    for p in shown:
        sender = p.get("sender") or "Χρήστης"
        when = p.get("time") or ""
        content = p.get("content") or ""
        rows += (
            '<tr><td style="padding:12px;border-bottom:1px solid #eee">'
            f'<p style="margin:0 0 4px 0;font-weight:600;color:#122f5e">{sender}'
            f'<span style="font-weight:normal;color:#999;font-size:12px"> • {when}</span></p>'
            f'<p style="margin:0;font-size:14px;color:#333">{content}</p></td></tr>'
        )
    if unread_count > 15:
        remaining = unread_count - 15
        word = "μήνυμα" if remaining == 1 else "μηνύματα"
        rows += (
            '<tr><td style="padding:12px;text-align:center;color:#666;font-style:italic">'
            f"... και {remaining} ακόμη {word}</td></tr>"
        )

    html = _layout(
        title,
        f"<p>Γεια σου {name}!</p>"
        f"<p>Έλαβες <strong>{count_label}</strong> τα τελευταία λεπτά.</p>"
        '<table style="width:100%;border-collapse:collapse;background:#f9f9f9;'
        f'border-radius:8px;overflow:hidden">{rows}</table>'
        + _button(_frontend("/dashboard/messages"), "Δες τα Μηνύματά σου"),
    )
    return send_email(email, f"{title} — Doulitsa", html, tag=EMAIL_TAGS["UNREAD_MESSAGES"])


def _format_amount_el(amount_cents: int, currency: str | None) -> str:
    """el-GR currency format — port of the Intl.NumberFormat call in
    sendSubscriptionPaymentEmail (admin-emails.ts:468-476): '1.234,56 €'."""
    value = (amount_cents or 0) / 100
    code = (currency or "EUR").upper()
    # "1,234.56" -> "1.234,56": swap the separators atomically.
    body = f"{value:,.2f}".translate(str.maketrans({",": ".", ".": ","}))
    return f"{body} €" if code == "EUR" else f"{body} {code}"


def send_subscription_payment_email(
    *,
    profile_id: str,
    profile_name: str | None,
    username: str | None,
    user_email: str | None,
    subscription_id: str,
    plan: str,
    billing_interval: str,
    amount_cents: int,
    currency: str | None,
    is_renewal: bool,
    payment_count: int | None = None,
    discount_code: str | None = None,
    order_id: str | None = None,
    payment_ref: str | None = None,
    paid_at: str | None = None,
) -> bool:
    """Notify the ADMIN of every subscription charge (initial + each renewal).

    Ports `sendSubscriptionPaymentEmail` (admin-emails.ts:440-520) + the
    SUBSCRIPTION_PAYMENT template (templates/subscription-payment.ts).
    `paid_at` is an ISO string (Celery-serializable); defaults to now.
    """
    from datetime import datetime, timezone
    from urllib.parse import quote

    name = profile_name or username or "Άγνωστος"
    plan_label = "Προωθημένο" if plan == "promoted" else "Δωρεάν"
    interval_label = "Ετήσια" if billing_interval == "year" else "Μηνιαία"
    type_label = "Ανανέωση Συνδρομής" if is_renewal else "Νέα Συνδρομή"
    amount_formatted = _format_amount_el(amount_cents, currency)
    admin_url = _frontend(f"/admin/subscriptions/{subscription_id}")
    public_url = _frontend(f"/profile/{quote(username or '')}")
    when = paid_at or datetime.now(timezone.utc).isoformat()

    sub_lines = f"Πακέτο: {plan_label}<br>Χρέωση: {interval_label}<br>Ποσό: {amount_formatted}"
    if discount_code:
        sub_lines += f"<br>Κωδικός έκπτωσης: {discount_code}"
    if payment_count:
        sub_lines += f"<br>Αριθμός πληρωμών: {payment_count}"

    payment_block = ""
    if order_id or payment_ref:
        refs = ""
        if order_id:
            refs += f"Order ID: {order_id}<br>"
        if payment_ref:
            refs += f"Payment Ref: {payment_ref}"
        payment_block = (
            '<p style="font-size:14px;color:#555"><strong>🧾 Στοιχεία Πληρωμής:</strong><br>'
            f"{refs}</p>"
        )

    html = _layout(
        type_label,
        f'<p style="font-size:22px;font-weight:700;color:#16a34a;margin:0">{amount_formatted}</p>'
        "<p><strong>👤 Στοιχεία Επαγγελματία:</strong><br>"
        f"Όνομα: {name}<br>Email: {user_email or ''}</p>"
        f"<p><strong>💳 Στοιχεία Συνδρομής:</strong><br>{sub_lines}</p>"
        + payment_block
        + _button(admin_url, "Προβολή Συνδρομής")
        + f'<p style="font-size:13px;color:#6b7280"><a href="{public_url}">Προβολή Προφίλ</a></p>'
        + f'<p style="font-size:12px;color:#999">Ημερομηνία: {when}</p>',
    )
    return send_email(
        _admin_email(),
        f"{type_label}: {name} — {amount_formatted}",
        html,
        tag=EMAIL_TAGS["SUBSCRIPTION_PAYMENT"],
    )
