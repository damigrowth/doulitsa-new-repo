"""Idempotent demo seeder.

Creates a small, realistic dataset so the platform can be exercised end-to-end:
- 1 admin (admin@doulitsa.gr / admin1234)
- 3 regular consumers in different journey states
- 4 published professional profiles (freelancer + company) with services
- A handful of cross-reviews so rating/badges show up

Re-running is safe: every record is upserted by email/username/slug.

Usage (inside the backend container):
    python manage.py seed_demo
    python manage.py seed_demo --reset   # delete demo rows first
"""
from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models.user import JourneyStep, User, UserRole, UserType
from apps.profiles.models.profile import Profile
from apps.reviews.models.review import Review, ReviewStatus, ReviewType
from apps.services.models.service import Service, ServiceStatus

DEMO_PASSWORD = "Demo1234!"

CONSUMERS = [
    {"email": "maria@example.com",  "name": "Μαρία Γεωργίου",   "step": JourneyStep.DASHBOARD},
    {"email": "kostas@example.com", "name": "Κώστας Αντωνίου",  "step": JourneyStep.DASHBOARD},
    {"email": "elena@example.com",  "name": "Έλενα Δημητρίου",  "step": JourneyStep.TYPE_SELECTION},
]

PROS = [
    {
        "email": "nikos.dev@example.com",
        "name": "Νίκος Παπαδόπουλος",
        "username": "nikos-dev",
        "role": UserRole.FREELANCER,
        "category": "pliroforiki",
        "subcategory": "anaptiksi-istoselidon",
        "tagline": "Full-stack developer με 8+ χρόνια εμπειρία σε React & Django",
        "bio": "Κατασκευάζω σύγχρονες web εφαρμογές για startups και επιχειρήσεις. "
               "Εξειδίκευση σε Next.js, TypeScript, Python και cloud deployments.",
        "skills": ["React", "Next.js", "TypeScript", "Django", "PostgreSQL", "Docker"],
        "rate": 50,
        "experience": 8,
        "services": [
            {
                "title": "Κατασκευή ιστοσελίδας με Next.js",
                "description": "Σχεδιάζω και υλοποιώ responsive ιστοσελίδες με σύγχρονα frameworks. "
                               "Παραδοτέο: live site, source code, βασικό SEO setup.",
                "category": "pliroforiki",
                "subcategory": "anaptiksi-istoselidon",
                "subdivision": "etairikes-istoselides",
                "tags": ["nextjs", "react", "responsive"],
                "fixed": True,
                "price": 80000,  # 800€ in cents
            },
            {
                "title": "Σύνδεση με REST API",
                "description": "Ολοκλήρωση εξωτερικών APIs (Stripe, Google, Brevo) στην εφαρμογή σας.",
                "category": "pliroforiki",
                "subcategory": "anaptiksi-efarmogon",
                "subdivision": "integrations",
                "tags": ["api", "integration", "backend"],
                "fixed": False,
                "price": 4500,  # 45€/h
                "duration": 60,
            },
        ],
    },
    {
        "email": "sofia.design@example.com",
        "name": "Σοφία Λάππα",
        "username": "sofia-design",
        "role": UserRole.FREELANCER,
        "category": "dimiourgia-periexomenou",
        "subcategory": "grafistiki",
        "tagline": "Graphic designer ειδικευμένη σε branding και UI",
        "bio": "Δημιουργώ λογότυπα, εταιρικές ταυτότητες και UI mockups. "
               "Συνεργάζομαι με ομάδες σε Figma και Adobe Suite.",
        "skills": ["Figma", "Illustrator", "Photoshop", "Branding", "UI/UX"],
        "rate": 35,
        "experience": 5,
        "services": [
            {
                "title": "Σχεδιασμός λογοτύπου",
                "description": "Πλήρες πακέτο: 3 αρχικές προτάσεις, αναθεωρήσεις, παράδοση σε όλα τα formats.",
                "category": "dimiourgia-periexomenou",
                "subcategory": "grafistiki",
                "subdivision": "logotypa",
                "tags": ["logo", "branding", "design"],
                "fixed": True,
                "price": 25000,  # 250€
            },
        ],
    },
    {
        "email": "diktiwsis@example.com",
        "name": "Δικτύωση ΕΠΕ",
        "username": "diktiwsis",
        "role": UserRole.COMPANY,
        "category": "texnika",
        "subcategory": "diktia-ipologiston",
        "tagline": "Δομημένη καλωδίωση και υποδομές δικτύου για επιχειρήσεις",
        "bio": "Αναλαμβάνουμε εγκαταστάσεις δομημένης καλωδίωσης, WiFi κάλυψη γραφείων, "
               "θύρες δικτύου και συντήρηση. 15+ έτη εμπειρίας.",
        "skills": ["Δομημένη καλωδίωση", "WiFi", "Cisco", "Συντήρηση"],
        "rate": 60,
        "experience": 15,
        "services": [
            {
                "title": "Εγκατάσταση δομημένης καλωδίωσης γραφείου",
                "description": "On-site εκτίμηση, καλωδίωση CAT6, patch panel, δοκιμές, εγγύηση 2 ετών.",
                "category": "texnika",
                "subcategory": "diktia-ipologiston",
                "subdivision": "egkatastasi",
                "tags": ["καλωδίωση", "γραφείο", "cat6"],
                "fixed": False,
                "price": 0,  # POA — quote on request
            },
        ],
    },
    {
        "email": "gianna.massage@example.com",
        "name": "Γιάννα Καραγιάννη",
        "username": "gianna-massage",
        "role": UserRole.FREELANCER,
        "category": "eveksia-frontida",
        "subcategory": "massaz",
        "tagline": "Πιστοποιημένη μασέρ — χαλαρωτικά & θεραπευτικά μασάζ κατ' οίκον",
        "bio": "8 χρόνια εμπειρίας σε σπορτ και χαλαρωτικά μασάζ. "
               "Έρχομαι σε εσάς με όλον τον εξοπλισμό.",
        "skills": ["Χαλαρωτικό", "Θεραπευτικό", "Σπορτ", "Lymphatic drainage"],
        "rate": 45,
        "experience": 8,
        "services": [
            {
                "title": "Χαλαρωτικό μασάζ 60 λεπτών κατ' οίκον",
                "description": "Πλήρες σώμα, χρήση αιθερίων ελαίων, εξοπλισμός παρέχεται.",
                "category": "eveksia-frontida",
                "subcategory": "massaz",
                "subdivision": "xalarwtiko",
                "tags": ["μασάζ", "κατ-οίκον", "χαλάρωση"],
                "fixed": True,
                "price": 4500,  # 45€
                "duration": 60,
            },
        ],
    },
]

DEMO_EMAILS = [c["email"] for c in CONSUMERS] + [p["email"] for p in PROS]


class Command(BaseCommand):
    help = "Seed demo users, profiles, services and reviews."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Delete demo rows first")

    @transaction.atomic
    def handle(self, *args, reset: bool = False, **opts):
        if reset:
            self.stdout.write(self.style.WARNING("Removing existing demo rows..."))
            User.objects.filter(email__in=DEMO_EMAILS).delete()

        self._consumers()
        pros = self._pros()
        self._reviews(pros)
        self._summary()

    def _consumers(self) -> None:
        for c in CONSUMERS:
            user, created = User.objects.update_or_create(
                email=c["email"],
                defaults={
                    "name": c["name"],
                    "step": c["step"],
                    "email_verified": True,
                    "confirmed": True,
                    "role": UserRole.USER,
                    "type": UserType.USER,
                },
            )
            user.set_password(DEMO_PASSWORD)
            user.save(update_fields=["password"])
            tag = "created" if created else "updated"
            self.stdout.write(f"  consumer {tag}: {user.email}")

    def _pros(self) -> list[Profile]:
        profiles: list[Profile] = []
        for p in PROS:
            user, _ = User.objects.update_or_create(
                email=p["email"],
                defaults={
                    "name": p["name"],
                    "username": p["username"],
                    "display_name": p["name"],
                    "step": JourneyStep.DASHBOARD,
                    "email_verified": True,
                    "confirmed": True,
                    "role": p["role"],
                    "type": UserType.PRO,
                },
            )
            user.set_password(DEMO_PASSWORD)
            user.save(update_fields=["password"])

            profile, _ = Profile.objects.update_or_create(
                user=user,
                defaults={
                    "type": "pro",
                    "username": p["username"],
                    "display_name": p["name"],
                    "tagline": p["tagline"],
                    "bio": p["bio"],
                    "category": p["category"],
                    "subcategory": p["subcategory"],
                    "skills": p["skills"],
                    "rate": p["rate"],
                    "experience": p["experience"],
                    "published": True,
                    "is_active": True,
                    "verified": True,
                },
            )
            profiles.append(profile)

            for s in p["services"]:
                Service.objects.update_or_create(
                    profile=profile,
                    title=s["title"],
                    defaults={
                        "slug": self._slug(s["title"], profile.username),
                        "description": s["description"],
                        "category": s["category"],
                        "subcategory": s["subcategory"],
                        "subdivision": s["subdivision"],
                        "tags": s["tags"],
                        "fixed": s["fixed"],
                        "price": s["price"],
                        "duration": s.get("duration") or 0,
                        "type": {
                            "online": False,
                            "presence": True,
                            "oneoff": True,
                            "onbase": False,
                            "subscription": False,
                            "onsite": True,
                        },
                        "addons": [],
                        "faq": [],
                        "media": None,
                        "status": ServiceStatus.PUBLISHED,
                        "sort_date": timezone.now(),
                    },
                )
            self.stdout.write(f"  pro:        {user.email}  ({len(p['services'])} services)")
        return profiles

    def _reviews(self, profiles: list[Profile]) -> None:
        consumers = list(User.objects.filter(email__in=[c["email"] for c in CONSUMERS]))
        review_data = [
            (4, "Πολύ καλή συνεργασία, στα χρόνια του."),
            (5, "Άψογος επαγγελματίας — θα ξανασυνεργαστώ."),
            (3, "Καλό αποτέλεσμα αλλά καθυστέρησε λίγο."),
            (5, "Άριστο αποτέλεσμα. Συνιστάται ανεπιφύλακτα."),
        ]
        for i, profile in enumerate(profiles):
            for j, (rating, comment) in enumerate(review_data[: 2 + i % 2]):
                author = consumers[(i + j) % len(consumers)]
                Review.objects.update_or_create(
                    profile=profile,
                    author=author,
                    defaults={
                        "rating": rating,
                        "comment": comment,
                        "type": ReviewType.PROFILE,
                        "status": ReviewStatus.APPROVED,
                        "published": True,
                        "visibility": True,
                    },
                )
            # Refresh aggregates
            agg = Review.objects.filter(profile=profile, published=True, visibility=True)
            count = agg.count()
            avg = sum(r.rating for r in agg) / count if count else 0
            profile.review_count = count
            profile.rating = round(avg, 2)
            profile.save(update_fields=["review_count", "rating"])
            self.stdout.write(f"  reviews:    {profile.username} ({count} reviews, avg {profile.rating})")

    def _slug(self, title: str, username: str) -> str:
        from common.utils.slug import create_slug
        return f"{create_slug(title)}-by-{username}"

    def _summary(self) -> None:
        self.stdout.write(self.style.SUCCESS("\nDemo seed complete."))
        self.stdout.write(f"  Login URL:       http://localhost:3010/login")
        self.stdout.write(f"  Admin URL:       http://localhost:8800/django-admin/  (admin@doulitsa.gr / admin1234)")
        self.stdout.write(f"  Demo password:   {DEMO_PASSWORD}")
        self.stdout.write("  Consumer emails: " + ", ".join(c["email"] for c in CONSUMERS))
        self.stdout.write("  Pro emails:      " + ", ".join(p["email"] for p in PROS))
