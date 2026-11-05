"""Transactional email senders (Brevo via django-anymail).

Ported from the OLD app's `src/lib/email/**` + `src/constants/email/**`. Each
builder renders the OLD subject + HTML + plain-text twin
(`apps.messaging.email_templates`, verbatim ports of the OLD templates) and
sends through the configured EMAIL_BACKEND (`anymail.backends.sendinblue`)
with OLD's per-email sender display name and Reply-To (`email-config.ts`).
Sends are best-effort: if Brevo isn't configured (no API key — e.g. local
dev) or the provider errors, we log and return False so a failed email NEVER
breaks the request/transaction that triggered it.

Called from `apps.messaging.tasks` Celery tasks (so sends are async) and
tagged for Brevo statistics exactly like OLD (`workflows.ts:36-42`: the tag is
the Brevo workflow/transactional enum value, except SERVICE_CREATED /
NEW_REVIEW which use the EMAIL_TAGS values).
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timezone as dt_timezone
from email.utils import formataddr, parseaddr
from urllib.parse import quote

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

from apps.messaging import email_templates as T

logger = logging.getLogger(__name__)

# Brevo stat tags — OLD `triggerWorkflow` tag = workflow.toString()
# (providers/brevo/types.ts BrevoTransactional / BrevoWorkflow enum values),
# with SERVICE_CREATED / NEW_REVIEW overridden by EMAIL_TAGS (workflows.ts:36-42).
# Auth emails (verification / welcome / reset) all went through
# BrevoWorkflow.USER_REGISTRATION (auth-integration.ts).
EMAIL_TAGS = {
    "EMAIL_VERIFICATION": "user_registration",
    "PASSWORD_RESET": "user_registration",
    "WELCOME": "user_registration",
    "CONTACT_FORM_ADMIN": "contact_admin",
    # OLD sent the confirmation with BrevoTransactional.CONTACT_ADMIN too
    # (contact-emails.ts:76 "Using CONTACT_ADMIN temporarily for confirmation").
    "CONTACT_FORM_USER": "contact_admin",
    "VERIFICATION_REQUEST": "new_verification",
    "SERVICE_REPORT": "service_report",
    "PROFILE_REPORT": "profile_report",
    "SUPPORT_FEEDBACK": "support_feedback",
    "NEW_REVIEW": "new-review",
    "REVIEW_APPROVED": "review_approved",
    "NEW_PROFILE": "new_profile",
    "SERVICE_CREATED": "service-created",
    "SERVICE_PUBLISHED": "service_published",
    "UNREAD_MESSAGES": "unread_messages",
    # Billing email — FROZEN (payments), tag left as it was.
    "SUBSCRIPTION_PAYMENT": "subscription-payment",
}

# OLD email-config.ts `from` display names.
FROM_USER = "Doulitsa"
FROM_ADMIN = "Admin Doulitsa"
# OLD CONTACT_CONFIRMATION replyTo (email-config.ts:119).
CONTACT_REPLY_TO = "contact@doulitsa.gr"

_TAG_RE = re.compile(r"<[^>]+>")

def _base() -> str:
    return settings.FRONTEND_BASE_URL.rstrip("/")


def _frontend(path: str) -> str:
    return f"{_base()}{path}"


def _encode_uri_component(value: str) -> str:
    """JS encodeURIComponent."""
    return quote(value or "", safe="-_.!~*'()")


def _admin_email() -> str:
    # Where admin notifications go. Mirrors OLD `process.env.ADMIN_EMAIL ||
    # 'contact@doulitsa.gr'` (constants/email/email-config.ts), with the existing
    # ADMIN_NOTIFICATION_EMAIL override first.
    return (
        getattr(settings, "ADMIN_NOTIFICATION_EMAIL", "")
        or getattr(settings, "ADMIN_EMAIL", "")
        or "contact@doulitsa.gr"
    )


def _configured() -> bool:
    return bool((getattr(settings, "ANYMAIL", {}) or {}).get("SENDINBLUE_API_KEY"))


def _sender(display_name: str | None) -> str | None:
    """`Name <address>` on the configured sender address (OLD parsed
    "Name <email>" in workflows.ts:46-54). None → Django DEFAULT_FROM_EMAIL."""
    if not display_name:
        return None
    raw = getattr(settings, "BREVO_SENDER_EMAIL", "") or settings.DEFAULT_FROM_EMAIL
    _name, address = parseaddr(raw)
    return formataddr((display_name, address or "noreply@doulitsa.gr"))


def _auth_sender() -> str:
    """OLD auth emails used getDefaultSender(): BREVO_SENDER_NAME || 'Doulitsa'."""
    return _sender(getattr(settings, "BREVO_SENDER_NAME", "") or FROM_USER)


def el_datetime(dt: datetime | None = None) -> str:
    """JS `date.toLocaleString('el-GR')` with the server TZ = Europe/Athens
    (OLD instrumentation.ts), e.g. '5/11/2026, 3:04:05 μ.μ.'."""
    from django.utils import timezone as dj_timezone

    dt = dt or dj_timezone.now()
    if dj_timezone.is_naive(dt):
        dt = dt.replace(tzinfo=dt_timezone.utc)
    local = dj_timezone.localtime(dt)
    hour12 = local.hour % 12 or 12
    ampm = "π.μ." if local.hour < 12 else "μ.μ."
    return (
        f"{local.day}/{local.month}/{local.year}, "
        f"{hour12}:{local.minute:02d}:{local.second:02d} {ampm}"
    )


def _athens_hhmm(dt: datetime) -> str:
    """OLD formatEmailMessageTime: el-GR 24h HH:MM in Europe/Athens."""
    from zoneinfo import ZoneInfo

    return dt.astimezone(ZoneInfo("Europe/Athens")).strftime("%H:%M")


def send_email(to, subject: str, html: str, *, tag: str | None = None, text: str | None = None,
               from_email: str | None = None, reply_to: str | None = None) -> bool:
    """Send one transactional email. Best-effort; never raises to the caller."""
    if not to:
        return False
    if not _configured():
        logger.info("email skipped (Brevo not configured): to=%s subject=%s tag=%s", to, subject, tag)
        return False
    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text if text is not None else _TAG_RE.sub("", html),
            from_email=from_email,
            to=[to] if isinstance(to, str) else list(to),
            reply_to=[reply_to] if reply_to else None,
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
# OLD auth-integration.ts + EMAIL_TEMPLATES (constants/email/templates/index.ts).
# OLD passed no text part for these three; the OLD *_TEXT twins (defined but
# unused there) are used instead of a tag-stripped dump.


def render_verification_email(*, token: str) -> tuple[str, str, str]:
    url = _frontend(f"/api/verify-email?token={token}")
    return (
        "Επιβεβαίωση λογαριασμού στη Doulitsa",
        T.fill(T.VERIFICATION_HTML, url=url),
        T.fill(T.VERIFICATION_TEXT, url=url),
    )


def send_verification_email(*, email: str, token: str, display_name: str | None = None,
                            username: str | None = None) -> bool:
    subject, html, text = render_verification_email(token=token)
    return send_email(email, subject, html, text=text, from_email=_auth_sender(),
                      tag=EMAIL_TAGS["EMAIL_VERIFICATION"])


def render_password_reset_email(*, token: str, display_name: str | None = None,
                                username: str | None = None) -> tuple[str, str, str]:
    url = _frontend(f"/reset-password?token={token}")
    greet = display_name or username or "φίλε"
    return (
        "Επαναφορά κωδικού πρόσβασης - Doulitsa",
        T.fill(T.PASSWORD_RESET_HTML, greetName=greet, url=url),
        T.fill(T.PASSWORD_RESET_TEXT, greetName=greet, url=url),
    )


def send_password_reset_email(*, email: str, token: str, display_name: str | None = None,
                              username: str | None = None) -> bool:
    subject, html, text = render_password_reset_email(
        token=token, display_name=display_name, username=username,
    )
    return send_email(email, subject, html, text=text, from_email=_auth_sender(),
                      tag=EMAIL_TAGS["PASSWORD_RESET"])


_WELCOME_PRO_HTML = """
                      <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif;">
                        Ως επαγγελματίας, μπορείτε να δημιουργήσετε το προφίλ σας και να προσελκύσετε νέους πελάτες.
                      </p>
                      """
_WELCOME_USER_HTML = """
                      <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif;">
                        Μπορείτε τώρα να αναζητήσετε και να επικοινωνήσετε με επαγγελματίες στην περιοχή σας.
                      </p>
                      """
_WELCOME_PRO_TEXT = "Ως επαγγελματίας, μπορείτε να δημιουργήσετε το προφίλ σας και να προσελκύσετε νέους πελάτες."
_WELCOME_USER_TEXT = "Μπορείτε τώρα να αναζητήσετε και να επικοινωνήσετε με επαγγελματίες στην περιοχή σας."


def render_welcome_email(*, display_name: str | None = None,
                         username: str | None = None) -> tuple[str, str, str]:
    greet = display_name or username or "φίλε"
    dashboard = _frontend("/dashboard")
    return (
        f"Καλώς ήρθες στο Doulitsa, {greet}!",
        T.fill(T.WELCOME_HTML, greetName=greet, dashboardUrl=dashboard,
               roleParagraph=_WELCOME_PRO_HTML if display_name else _WELCOME_USER_HTML),
        T.fill(T.WELCOME_TEXT, greetName=greet, dashboardUrl=dashboard,
               roleParagraph=_WELCOME_PRO_TEXT if display_name else _WELCOME_USER_TEXT),
    )


def send_welcome_email(*, email: str, display_name: str | None = None, username: str | None = None) -> bool:
    """Ported for completeness. NOTE: OLD never called sendWelcomeEmail (the
    welcome is a Brevo automation on list-add), and NEW no longer enqueues it
    at verification either (P2-7 double-welcome)."""
    subject, html, text = render_welcome_email(display_name=display_name, username=username)
    return send_email(email, subject, html, text=text, from_email=_auth_sender(),
                      tag=EMAIL_TAGS["WELCOME"])


# --- Contact / support -----------------------------------------------------
# OLD contact-emails.ts + EMAIL_CONFIG.CONTACT_ADMIN / CONTACT_CONFIRMATION.


def render_contact_admin_email(*, name: str, email: str, subject: str | None, message: str,
                               contact_id=None) -> tuple[str, str, str]:
    subject_or_default = subject or "Φόρμα Επικοινωνίας"
    id_html = (
        """
                                            <tr>
                                                <td style="padding: 10px 0 0 0; border-top: 1px solid #cccccc;">
                                                    <p style="margin: 0; font-size: 12px; color: #999999;">ID Μηνύματος: """
        + f"{contact_id}"
        + """</p>
                                                </td>
                                            </tr>
                                            """
    ) if contact_id else ""
    id_text = f"ID Μηνύματος: {contact_id}" if contact_id else ""
    ctx = dict(name=name, email=email, message=message, subjectOrDefault=subject_or_default)
    return (
        f"Νέα Φόρμα Επικοινωνίας - {email}",
        T.fill(T.CONTACT_ADMIN_HTML, contactIdBlock=id_html, **ctx),
        T.fill(T.CONTACT_ADMIN_TEXT, contactIdBlock=id_text, **ctx),
    )


def send_contact_admin_email(*, name: str, email: str, subject: str | None, message: str,
                             contact_id=None) -> bool:
    subj, html, text = render_contact_admin_email(
        name=name, email=email, subject=subject, message=message, contact_id=contact_id,
    )
    return send_email(_admin_email(), subj, html, text=text, from_email=_sender(FROM_ADMIN),
                      reply_to=email or None, tag=EMAIL_TAGS["CONTACT_FORM_ADMIN"])


def render_contact_user_email(*, name: str | None = None) -> tuple[str, str, str]:
    name = name or ""
    return (
        "Λάβαμε το μήνυμα σου!",
        T.fill(T.CONTACT_CONFIRMATION_HTML, name=name),
        T.fill(T.CONTACT_CONFIRMATION_TEXT, nameUpper=name.upper()),
    )


def send_contact_user_email(*, email: str, name: str | None = None) -> bool:
    subj, html, text = render_contact_user_email(name=name)
    return send_email(email, subj, html, text=text, from_email=_sender(FROM_USER),
                      reply_to=CONTACT_REPLY_TO, tag=EMAIL_TAGS["CONTACT_FORM_USER"])


# OLD submit-feedback / admin-emails.ts:315-319 issueTypeLabels. The API also
# accepts bug/question/other (kept for compatibility) — labelled sensibly.
FEEDBACK_ISSUE_LABELS = {
    "problem": "Αναφορά Προβλήματος",
    "option": "Προσθήκη μιας νέας επιλογής",
    "feature": "Πρόταση νέας δυνατότητας",
    "bug": "Αναφορά Προβλήματος",
    "question": "Ερώτηση",
    "other": "Άλλο",
}


def render_support_feedback_email(*, reporter_id: str, reporter_name: str, reporter_email: str,
                                  reporter_username: str, issue_type: str, description: str,
                                  page_url: str, submit_date: datetime | None = None
                                  ) -> tuple[str, str, str]:
    from django.utils import timezone as dj_timezone

    label = FEEDBACK_ISSUE_LABELS.get(issue_type, issue_type)
    ctx = dict(
        reporterId=reporter_id, reporterName=reporter_name, reporterEmail=reporter_email,
        reporterUsername=reporter_username, issueTypeLabel=label, description=description,
        pageUrl=page_url, reporterAdminUrl=_frontend(f"/admin/users/{reporter_id}"),
        formattedDate=el_datetime(submit_date), year=dj_timezone.localdate().year,
    )
    return (
        f"{label} από {reporter_name}",
        T.fill(T.SUPPORT_FEEDBACK_HTML, **ctx),
        T.fill(T.SUPPORT_FEEDBACK_TEXT, **ctx),
    )


def send_support_feedback_email(**kwargs) -> bool:
    """OLD sendSupportFeedbackEmail (admin-emails.ts:290-358)."""
    subj, html, text = render_support_feedback_email(**kwargs)
    return send_email(_admin_email(), subj, html, text=text, from_email=_sender(FROM_ADMIN),
                      reply_to=kwargs.get("reporter_email") or None,
                      tag=EMAIL_TAGS["SUPPORT_FEEDBACK"])


# --- Admin notifications (verification / reports) ---------------------------


def render_verification_request_admin_email(*, display_name: str, user_email: str,
                                            profile_id: str, verification_id: str
                                            ) -> tuple[str, str, str]:
    ctx = dict(BASE=_base(), displayName=display_name, userEmail=user_email,
               profileId=profile_id, verificationId=verification_id)
    return (
        f"Νέο Αίτημα Πιστοποίησης - {display_name} ({user_email})",
        T.fill(T.NEW_VERIFICATION_HTML, **ctx),
        T.fill(T.NEW_VERIFICATION_TEXT, **ctx),
    )


def send_verification_request_admin_email(*, display_name: str, user_email: str,
                                          profile_id: str, verification_id: str) -> bool:
    """OLD sendNewVerificationEmail (admin-emails.ts:20-75)."""
    subj, html, text = render_verification_request_admin_email(
        display_name=display_name, user_email=user_email,
        profile_id=profile_id, verification_id=verification_id,
    )
    return send_email(_admin_email(), subj, html, text=text, from_email=_sender(FROM_ADMIN),
                      tag=EMAIL_TAGS["VERIFICATION_REQUEST"])


def render_service_report_email(*, service_id, service_title: str, service_slug: str,
                                reporter_id: str, reporter_name: str, reporter_email: str,
                                reporter_username: str, report_details: str,
                                report_date: datetime | None = None) -> tuple[str, str, str]:
    ctx = dict(
        serviceId=service_id, serviceTitle=service_title, serviceSlug=service_slug,
        reporterId=reporter_id, reporterName=reporter_name, reporterEmail=reporter_email,
        reporterUsername=reporter_username, reportDetails=report_details,
        reportDateFmt=el_datetime(report_date),
        servicePageUrl=_frontend(f"/s/{service_slug}"),
        serviceAdminUrl=_frontend(f"/admin/services/{service_id}"),
        reporterAdminUrl=_frontend(f"/admin/profiles/{reporter_id}"),
    )
    return (
        f"Αναφορά Υπηρεσίας - {service_title}",
        T.fill(T.SERVICE_REPORT_HTML, **ctx),
        T.fill(T.SERVICE_REPORT_TEXT, **ctx),
    )


def send_service_report_email(**kwargs) -> bool:
    """OLD sendServiceReportEmail (admin-emails.ts:80-146)."""
    subj, html, text = render_service_report_email(**kwargs)
    return send_email(_admin_email(), subj, html, text=text, from_email=_sender(FROM_ADMIN),
                      reply_to=kwargs.get("reporter_email") or None,
                      tag=EMAIL_TAGS["SERVICE_REPORT"])


def render_profile_report_email(*, profile_id: str, profile_name: str, profile_email: str,
                                profile_username: str, reporter_id: str, reporter_name: str,
                                reporter_email: str, reporter_username: str, report_details: str,
                                report_date: datetime | None = None) -> tuple[str, str, str]:
    ctx = dict(
        profileId=profile_id, profileName=profile_name, profileEmail=profile_email,
        profileUsername=profile_username, reporterId=reporter_id, reporterName=reporter_name,
        reporterEmail=reporter_email, reporterUsername=reporter_username,
        reportDetails=report_details, reportDateFmt=el_datetime(report_date),
        profilePageUrl=_frontend(f"/profile/{profile_username}"),
        # OLD admin-emails.ts:190-191 (sic: /admin/users/<profileId>).
        reportedUserAdminUrl=_frontend(f"/admin/users/{profile_id}"),
        reporterAdminUrl=_frontend(f"/admin/profiles/{reporter_id}"),
    )
    return (
        f"Αναφορά Προφίλ - {profile_name}",
        T.fill(T.PROFILE_REPORT_HTML, **ctx),
        T.fill(T.PROFILE_REPORT_TEXT, **ctx),
    )


def send_profile_report_email(**kwargs) -> bool:
    """OLD sendProfileReportEmail (admin-emails.ts:151-222)."""
    subj, html, text = render_profile_report_email(**kwargs)
    return send_email(_admin_email(), subj, html, text=text, from_email=_sender(FROM_ADMIN),
                      reply_to=kwargs.get("reporter_email") or None,
                      tag=EMAIL_TAGS["PROFILE_REPORT"])


# --- Reviews ---------------------------------------------------------------


def render_new_review_email(*, rating=None, review_id=None, author_email=None,
                            receiver_name=None, receiver_email=None, comment=None,
                            service_name=None) -> tuple[str, str, str]:
    receiver_name = receiver_name or ""
    comment_html = (
        """
                      <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif;">
                        <strong>Σχόλιο:</strong> \"""" + f"{comment}" + """\"
                      </p>"""
    ) if comment else ""
    service_html = (
        """
                      <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif;">
                        <strong>Υπηρεσία:</strong> """ + f"{service_name}" + """
                      </p>"""
    ) if service_name else ""
    ctx = dict(BASE=_base(), authorEmail=author_email or "", receiverEmail=receiver_email or "",
               reviewId=review_id or "")
    return (
        f"Νέα Αξιολόγηση για {receiver_name}",
        T.fill(T.NEW_REVIEW_HTML, receiverName=receiver_name,
               sentiment="&#128077; Θετική" if rating == 5 else "&#128078; Αρνητική",
               commentBlock=comment_html, serviceBlock=service_html, **ctx),
        T.fill(T.NEW_REVIEW_TEXT, receiverNameUpper=receiver_name.upper(),
               sentiment="👍 Θετική" if rating == 5 else "👎 Αρνητική",
               commentBlock=f'\nΣχόλιο: "{comment}"' if comment else "",
               serviceBlock=f"\nΥπηρεσία: {service_name}" if service_name else "", **ctx),
    )


def send_new_review_email(**kwargs) -> bool:
    """Notify the ADMIN that a new review is pending moderation (OLD
    sendNewReviewEmail admin-emails.ts:366 + NEW_REVIEW config/template)."""
    subj, html, text = render_new_review_email(**kwargs)
    return send_email(_admin_email(), subj, html, text=text, from_email=_sender(FROM_ADMIN),
                      tag=EMAIL_TAGS["NEW_REVIEW"])


def render_review_approved_email(*, rating=None, comment=None, service_name=None
                                 ) -> tuple[str, str, str]:
    service_html = (
        """
                      <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif;">
                        για την υπηρεσία <strong>""" + f"{service_name}" + """</strong>
                      </p>"""
    ) if service_name else ""
    comment_html = (
        """
                      <p style="margin: 20px 0 12px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif; color: #333; font-style: italic;">
                        \"""" + f"{comment}" + """\"
                      </p>
                      <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif; color: #666;">
                        Συνδεθείτε στον λογαριασμό σας για να εγκρίνετε την αξιολόγηση ώστε να εμφανίζεται δημόσια!
                      </p>"""
    ) if comment else ""
    comment_text = (
        f'\n\n"{comment}"\n\nΣυνδεθείτε στον λογαριασμό σας για να εγκρίνετε την '
        "αξιολόγηση ώστε να εμφανίζεται δημόσια!"
    ) if comment else ""
    dashboard = _frontend("/dashboard/reviews")
    return (
        "Νέα Αξιολόγηση!",
        T.fill(T.REVIEW_APPROVED_HTML, dashboardUrl=dashboard,
               sentiment="&#128077; θετική" if rating == 5 else "&#128078; αρνητική",
               serviceBlock=service_html, commentBlock=comment_html),
        T.fill(T.REVIEW_APPROVED_TEXT, dashboardUrl=dashboard,
               sentiment="👍 θετική" if rating == 5 else "👎 αρνητική",
               serviceBlock=f"\nγια την υπηρεσία {service_name}" if service_name else "",
               commentBlock=comment_text),
    )


def send_review_approved_email(*, email: str, rating=None, comment=None, service_name=None) -> bool:
    """Notify the PROFILE OWNER that a new approved review landed (OLD
    sendReviewApprovedEmail review-emails.ts:17-76)."""
    subj, html, text = render_review_approved_email(
        rating=rating, comment=comment, service_name=service_name,
    )
    return send_email(email, subj, html, text=text, from_email=_sender(FROM_USER),
                      tag=EMAIL_TAGS["REVIEW_APPROVED"])


# --- Profiles --------------------------------------------------------------


def render_new_profile_email(*, profile_id: str, profile_name: str, username: str,
                             user_email: str, user_type: str | None = None,
                             created_at: datetime | None = None) -> tuple[str, str, str]:
    ctx = dict(
        profileName=profile_name, userEmail=user_email, userType=user_type or "",
        publicUrl=_frontend(f"/profile/{_encode_uri_component(username)}"),
        adminUrl=_frontend(f"/admin/profiles/{profile_id}"),
        createdAtFmt=el_datetime(created_at),
    )
    return (
        f"Νέο Επαγγελματικό Προφίλ - {profile_name} ({user_email})",
        T.fill(T.NEW_PROFILE_HTML, **ctx),
        T.fill(T.NEW_PROFILE_TEXT, **ctx),
    )


def send_new_profile_email(*, profile_id: str, profile_name: str, username: str,
                           user_email: str, user_type: str | None = None) -> bool:
    """Notify ADMIN that a new pro profile completed onboarding (OLD
    sendNewProfileEmail admin-emails.ts:230-283)."""
    subj, html, text = render_new_profile_email(
        profile_id=profile_id, profile_name=profile_name, username=username,
        user_email=user_email, user_type=user_type,
    )
    return send_email(_admin_email(), subj, html, text=text, from_email=_sender(FROM_ADMIN),
                      tag=EMAIL_TAGS["NEW_PROFILE"])


# --- Services --------------------------------------------------------------


def render_service_created_email(*, service_title: str, service_description: str,
                                 service_id: str, creator_name: str, creator_email: str,
                                 created_at: datetime | None = None) -> tuple[str, str, str]:
    ctx = dict(
        serviceTitle=service_title, serviceDescription=service_description,
        creatorName=creator_name, creatorEmail=creator_email,
        adminReviewUrl=_frontend(f"/admin/services/{service_id}"),
        createdAtFmt=el_datetime(created_at),
    )
    return (
        f"Νέα Υπηρεσία - {service_title} - από {creator_email}",
        T.fill(T.SERVICE_CREATED_HTML, **ctx),
        T.fill(T.SERVICE_CREATED_TEXT, **ctx),
    )


def send_service_created_email(*, service_title: str, service_description: str,
                               service_id: str, creator_name: str, creator_email: str,
                               category: str | None = None) -> bool:
    """Notify ADMIN that a new (non-draft) service was submitted (OLD
    sendServiceCreatedEmail service-emails.ts:19-94). OLD's template never
    rendered the category (the raw category id the generic body used to show
    is gone); `category` is accepted for call-site compatibility only."""
    subj, html, text = render_service_created_email(
        service_title=service_title, service_description=service_description,
        service_id=service_id, creator_name=creator_name, creator_email=creator_email,
    )
    return send_email(_admin_email(), subj, html, text=text, from_email=_sender(FROM_ADMIN),
                      tag=EMAIL_TAGS["SERVICE_CREATED"])


def render_service_published_email(*, service_title: str, service_slug: str, service_id: str,
                                   user_name: str | None = None) -> tuple[str, str, str]:
    name = user_name or "φίλε"
    ctx = dict(BASE=_base(), serviceTitle=service_title, serviceSlug=service_slug,
               serviceId=service_id)
    return (
        f'Η υπηρεσία σας "{service_title}" δημοσιεύτηκε!',
        T.fill(T.SERVICE_PUBLISHED_HTML, userName=name, **ctx),
        T.fill(T.SERVICE_PUBLISHED_TEXT, userNameUpper=name.upper(), **ctx),
    )


def send_service_published_email(*, email: str, service_title: str, service_slug: str,
                                 service_id: str, user_name: str | None = None) -> bool:
    """Notify the service OWNER that their service is now live (OLD
    sendServicePublishedEmail service-emails.ts:100-157)."""
    subj, html, text = render_service_published_email(
        service_title=service_title, service_slug=service_slug,
        service_id=service_id, user_name=user_name,
    )
    return send_email(email, subj, html, text=text, from_email=_sender(FROM_USER),
                      tag=EMAIL_TAGS["SERVICE_PUBLISHED"])


# --- Messaging -------------------------------------------------------------


def _truncate(content: str, max_len: int) -> str:
    """OLD truncateMessage (templates/unread-messages.ts:41-44)."""
    return content if len(content) <= max_len else content[:max_len] + "..."


_DIGEST_ROW_HTML = """
      <tr>
        <td style="padding: 15px; border-bottom: 1px solid #eee;">
          <p style="margin: 0 0 5px 0; font-size: 14px; font-weight: 600; color: #122f5e;">
            ${sender}
            <span style="font-weight: normal; color: #999; font-size: 12px;">• ${time}</span>
          </p>
          <p style="margin: 0; font-size: 14px; line-height: 20px; color: #333;">
            ${content}
          </p>
        </td>
      </tr>
    """

_DIGEST_MORE_HTML = """
      <tr>
        <td style="padding: 15px; text-align: center; background-color: #f9f9f9; border-top: 2px solid #eee;">
          <p style="margin: 0; font-size: 14px; color: #666; font-style: italic;">
            ... και ${remaining} ακόμη ${word}
          </p>
        </td>
      </tr>
    """


def render_unread_digest_email(*, user_name: str | None, unread_count: int,
                               previews: list[dict]) -> tuple[str, str, str]:
    """`previews` = the new unread messages NEWEST-FIRST (OLD route.ts
    `orderBy: { createdAt: 'desc' }`), dicts with sender / content / time.
    OLD template: `messages.slice(0, 15).reverse()` → the 15 NEWEST, shown
    oldest-first; HTML previews truncated at 120 chars, text at 100."""
    name = user_name or "φίλε"
    shown = list(previews[:15])[::-1]
    more = unread_count > 15
    remaining = unread_count - 15
    word = "μήνυμα" if remaining == 1 else "μηνύματα"

    rows_html = "".join(
        T.fill(_DIGEST_ROW_HTML, sender=p.get("sender") or "Χρήστης", time=p.get("time") or "",
               content=_truncate(p.get("content") or "", 120))
        for p in shown
    ) + (T.fill(_DIGEST_MORE_HTML, remaining=remaining, word=word) if more else "")

    rows_text = "\n\n".join(
        f"• {p.get('sender') or 'Χρήστης'} ({p.get('time') or ''}): "
        f"{_truncate(p.get('content') or '', 100)}"
        for p in shown
    ) + (f"\n\n... και {remaining} ακόμη {word}" if more else "")

    dashboard = _frontend("/dashboard/messages")
    subject = (
        "Έχεις 1 αδιάβαστο μήνυμα - Doulitsa" if unread_count == 1
        else f"Έχεις {unread_count} αδιάβαστα μηνύματα - Doulitsa"
    )
    html = T.fill(
        T.UNREAD_MESSAGES_HTML,
        title="Νέο Μήνυμα" if unread_count == 1 else "Νέα Μηνύματα",
        userName=name,
        countLabel="1 μήνυμα" if unread_count == 1 else f"{unread_count} μηνύματα",
        messageListHTML=rows_html,
        dashboardUrl=dashboard,
    )
    text = T.fill(T.UNREAD_MESSAGES_TEXT, userName=name, unreadCount=unread_count,
                  messagesList=rows_text, dashboardUrl=dashboard)
    return subject, html, text


def send_unread_digest_email(*, email: str, user_name: str | None,
                             unread_count: int, previews: list[dict]) -> bool:
    """Send the unread-messages digest (OLD sendUnreadMessagesEmail
    message-emails.ts:17-84)."""
    subj, html, text = render_unread_digest_email(
        user_name=user_name, unread_count=unread_count, previews=previews,
    )
    return send_email(email, subj, html, text=text, from_email=_sender(FROM_USER),
                      tag=EMAIL_TAGS["UNREAD_MESSAGES"])


# --- Billing (FROZEN — payments; body unchanged) -----------------------------

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
