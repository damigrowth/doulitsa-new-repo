"""Bulk-seed N professional users + services + reviews + Picsum images.

Designed for quickly populating a demo environment so every category,
subcategory, archive, and search page has real-looking data behind it.

Image strategy: Lorem Picsum (`https://picsum.photos/seed/<seed>/W/H`).
Picsum returns a deterministic random photo per seed string, so re-runs
produce the exact same image set.

Usage (inside the backend container):
    python manage.py seed_pros                  # default: 200 pros
    python manage.py seed_pros --count 50       # smaller batch
    python manage.py seed_pros --reset          # wipe seeded pros first

Re-running is idempotent: every account is upserted by email
(`pro-{i:03d}@demo.doulitsa.gr`).
"""
from __future__ import annotations

import json
import random
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models.user import JourneyStep, User, UserRole, UserType
from apps.profiles.models.profile import Profile
from apps.reviews.models.review import Review, ReviewStatus, ReviewType
from apps.services.models.service import Service, ServiceStatus

DEMO_PASSWORD = "Demo1234!"
EMAIL_PATTERN = "pro-{:03d}@demo.doulitsa.gr"
USERNAME_PATTERN = "pro-{:03d}"

LEAVES_PATH = Path(__file__).with_name("_taxonomy_leaves.json")

# --- Greek-realistic name banks --------------------------------------------

FIRST_NAMES_M = [
    "Νίκος", "Γιώργος", "Δημήτρης", "Κώστας", "Γιάννης", "Παναγιώτης",
    "Αντώνης", "Χρήστος", "Μιχάλης", "Σπύρος", "Στέφανος", "Πέτρος",
    "Σωτήρης", "Φώτης", "Λευτέρης", "Βασίλης", "Αλέξανδρος", "Ηλίας",
    "Θανάσης", "Μάνος", "Νεκτάριος", "Ανδρέας", "Ευάγγελος", "Άγγελος",
    "Στέλιος", "Μάριος", "Λάμπρος", "Τάκης", "Παύλος", "Μάνθος",
]
FIRST_NAMES_F = [
    "Μαρία", "Ελένη", "Σοφία", "Κατερίνα", "Ιωάννα", "Αναστασία",
    "Δήμητρα", "Γεωργία", "Ευαγγελία", "Νίκη", "Άννα", "Παναγιώτα",
    "Χριστίνα", "Βάσω", "Ζωή", "Αγγελική", "Όλγα", "Ντίνα",
    "Έλσα", "Λίνα", "Στέλλα", "Φωτεινή", "Δέσποινα", "Ξένια",
    "Πηνελόπη", "Έφη", "Ραφαέλα", "Τίνα", "Μυρτώ", "Αλεξάνδρα",
]
LAST_NAMES = [
    "Παπαδόπουλος", "Παπαδοπούλου", "Γεωργίου", "Νικολάου", "Δημητρίου",
    "Παπανικολάου", "Αντωνίου", "Παπαγιάννης", "Σταυρόπουλος", "Λάππας",
    "Καραγιάννης", "Καραγιάννη", "Μιχαηλίδης", "Σπανός", "Κωνσταντίνου",
    "Παπακωνσταντίνου", "Βασιλειάδης", "Οικονόμου", "Τσαγκαράκης", "Καλογερόπουλος",
    "Μαυρομάτης", "Πρωτονοτάριος", "Πετράκης", "Βλάχος", "Φλωράκης",
    "Ξυλούρης", "Δασκαλάκης", "Ζαχαρίας", "Σαμαράς", "Κουτσούκος",
]
COMPANY_SUFFIXES = ["Studio", "Group", "Solutions", "Hellas", "Pro", "Workshop", "Co", "Lab"]
COMPANY_PREFIXES = [
    "Atlas", "Olympia", "Aegean", "Athens", "Hellas", "Pillar", "Phoenix",
    "Mosaic", "Spectrum", "Pyrgos", "Arcadia", "Theseus", "Helio", "Mythos",
]
LOCATIONS = [
    "Αθήνα", "Θεσσαλονίκη", "Πάτρα", "Λάρισα", "Ηράκλειο", "Βόλος",
    "Ιωάννινα", "Ξάνθη", "Καβάλα", "Ρόδος", "Χανιά", "Κέρκυρα",
    "Καλαμάτα", "Σέρρες", "Καρδίτσα", "Τρίκαλα", "Αλεξανδρούπολη",
]

# Sentence fragments to glue into bios so they don't all read identically
BIO_OPENERS = [
    "Επαγγελματίας με πολυετή εμπειρία",
    "Εξειδικευμένος συνεργάτης για επιχειρήσεις",
    "Δραστήρια ομάδα που υποστηρίζει",
    "Ιδιώτες και επιχειρήσεις εμπιστεύονται την ομάδα μας",
    "Παρέχουμε αξιόπιστες υπηρεσίες",
]
BIO_BODIES = [
    "σε όλη την Ελλάδα. Στόχος μας η ποιότητα και η συνέπεια στις παραδόσεις.",
    "με σύγχρονο εξοπλισμό και αποδεδειγμένη μεθοδολογία.",
    "και έμφαση στην εξυπηρέτηση πελατών μετά την ολοκλήρωση του έργου.",
    "βασισμένες σε διεθνή πρότυπα και πιστοποιημένες διαδικασίες.",
    "με ευελιξία στο ωράριο και προσαρμογή στις ανάγκες του πελάτη.",
]

REVIEW_COMMENTS = [
    "Άψογος επαγγελματίας — θα ξανασυνεργαστώ.",
    "Πολύ καλή συνεργασία, στα χρόνια του.",
    "Παρέδωσε ακριβώς αυτό που συμφωνήσαμε.",
    "Συνεπής, ευγενικός και αξιόπιστος.",
    "Καλό αποτέλεσμα αλλά καθυστέρησε λίγο.",
    "Άριστη επικοινωνία από την πρώτη στιγμή.",
    "Συνιστάται ανεπιφύλακτα — θα τον προτείνω.",
    "Τιμή αντίστοιχη της ποιότητας — δίκαιη συνεργασία.",
    "Λίγη καθυστέρηση αλλά ικανοποιήθηκα τελικά.",
    "Επαγγελματικό αποτέλεσμα και καθαρή δουλειά.",
]

SERVICE_TYPE_OPTIONS = [
    {"online": True,  "presence": False, "oneoff": True,  "onbase": False, "subscription": False, "onsite": False},
    {"online": False, "presence": True,  "oneoff": True,  "onbase": False, "subscription": False, "onsite": True},
    {"online": True,  "presence": True,  "oneoff": True,  "onbase": True,  "subscription": False, "onsite": False},
    {"online": False, "presence": True,  "oneoff": False, "onbase": False, "subscription": True,  "onsite": True},
]


def picsum(seed: str, width: int = 1200, height: int = 800) -> str:
    """Deterministic Picsum URL — same seed string returns the same image."""
    return f"https://picsum.photos/seed/{seed}/{width}/{height}"


def media_resource(seed: str, w: int = 1200, h: int = 800) -> dict:
    """Cloudinary-shaped media object so frontend image readers don't change."""
    url = picsum(seed, w, h)
    return {
        "public_id": f"demo/{seed}",
        "secure_url": url,
        "url": url,
        "width": w,
        "height": h,
        "format": "jpg",
        "resource_type": "image",
        "bytes": 100000,
    }


class Command(BaseCommand):
    help = "Seed N pro users with profiles, services and reviews."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=200, help="Number of pros to create (default 200)")
        parser.add_argument("--reset", action="store_true", help="Delete previously seeded pros first")
        parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")

    @transaction.atomic
    def handle(self, *args, count: int = 200, reset: bool = False, seed: int = 42, **opts):
        random.seed(seed)
        leaves = json.loads(LEAVES_PATH.read_text())
        # Pre-shuffle a deterministic copy so each pro gets a varied category
        leaves_pool = leaves * ((count // len(leaves)) + 1)
        random.shuffle(leaves_pool)

        if reset:
            self._reset()

        # Reuse the original 3 demo consumers as review authors so we don't
        # spin up another hundred fake users just to leave reviews.
        consumers = list(User.objects.filter(email__icontains="@example.com")[:10])
        if not consumers:
            self.stdout.write(self.style.WARNING(
                "No demo consumers found — run `seed_demo` first to get review authors."
            ))
            return

        created_pros = 0
        created_services = 0
        created_reviews = 0
        for i in range(1, count + 1):
            user, profile, n_services = self._make_pro(i, leaves_pool)
            n_reviews = self._make_reviews(profile, consumers)
            created_pros += 1
            created_services += n_services
            created_reviews += n_reviews
            if i % 25 == 0:
                self.stdout.write(f"  ... {i:>3}/{count} pros created")

        self.stdout.write(self.style.SUCCESS(
            f"\nDone. {created_pros} pros · {created_services} services · {created_reviews} reviews"
        ))
        self.stdout.write(f"  Login any of:  {EMAIL_PATTERN.format(1)} ... {EMAIL_PATTERN.format(count)}")
        self.stdout.write(f"  Password:      {DEMO_PASSWORD}")
        self.stdout.write(f"  Sample profile: http://localhost:3010/profile/{USERNAME_PATTERN.format(1)}")

    # ------------------------------------------------------------------ helpers

    def _reset(self) -> None:
        n = User.objects.filter(email__endswith="@demo.doulitsa.gr").count()
        self.stdout.write(self.style.WARNING(f"Removing {n} previously seeded pros..."))
        User.objects.filter(email__endswith="@demo.doulitsa.gr").delete()

    def _make_pro(self, i: int, leaves_pool: list[dict]) -> tuple[User, Profile, int]:
        is_company = (i % 7 == 0)
        if is_company:
            full_name = f"{random.choice(COMPANY_PREFIXES)} {random.choice(COMPANY_SUFFIXES)}"
        else:
            first = random.choice(FIRST_NAMES_M + FIRST_NAMES_F)
            last = random.choice(LAST_NAMES)
            full_name = f"{first} {last}"

        email = EMAIL_PATTERN.format(i)
        username = USERNAME_PATTERN.format(i)
        location = random.choice(LOCATIONS)
        leaf = leaves_pool[i - 1]
        bio = (
            f"{random.choice(BIO_OPENERS)} στον τομέα «{leaf['subcategory_label']}» "
            f"{random.choice(BIO_BODIES)} Έδρα: {location}."
        )

        user, _ = User.objects.update_or_create(
            email=email,
            defaults={
                "name": full_name,
                "username": username,
                "display_name": full_name,
                "step": JourneyStep.DASHBOARD,
                "email_verified": True,
                "confirmed": True,
                "role": UserRole.COMPANY if is_company else UserRole.FREELANCER,
                "type": UserType.PRO,
                "image": picsum(f"avatar-{i}", 256, 256),
            },
        )
        user.set_password(DEMO_PASSWORD)
        user.save(update_fields=["password"])

        profile, _ = Profile.objects.update_or_create(
            user=user,
            defaults={
                "type": "pro",
                "username": username,
                "display_name": full_name,
                "tagline": f"{leaf['label']} — {location} και πανελλαδικά",
                "bio": bio,
                "category": leaf["category"],
                "subcategory": leaf["subcategory"],
                "speciality": leaf["subdivision"],
                "skills": [leaf["label"], leaf["subcategory_label"], leaf["category_label"]],
                "rate": random.choice([20, 25, 30, 35, 40, 45, 50, 60, 75, 100]),
                "experience": random.randint(1, 20),
                "image": picsum(f"avatar-{i}", 512, 512),
                "published": True,
                "is_active": True,
                "verified": True,
                "featured": (i % 11 == 0),
                "top": (i % 17 == 0),
            },
        )

        n_services = random.randint(1, 3)
        for j in range(n_services):
            self._make_service(profile, leaves_pool[(i + j * 137) % len(leaves_pool)], i, j)

        return user, profile, n_services

    def _make_service(self, profile: Profile, leaf: dict, pro_idx: int, svc_idx: int) -> None:
        title = f"{leaf['label']} — επαγγελματική υπηρεσία"
        # Two-pass: insert with a placeholder slug to get a stable PK, then
        # rename the slug so it ends with the numeric ID. The frontend
        # `/s/[slug]` page parses the trailing -<id> to look the service up,
        # so the ID MUST be the last hyphen-separated token in the slug.
        fixed = random.choice([True, True, False])  # Bias toward fixed pricing
        placeholder = f"{leaf['subdivision']}-pro-{pro_idx:03d}-svc-{svc_idx}-tmp"
        service, _ = Service.objects.update_or_create(
            slug=placeholder,
            defaults={
                "profile": profile,
                "title": title,
                "description": (
                    f"Παρέχω υπηρεσία «{leaf['label']}» στην κατηγορία "
                    f"«{leaf['category_label']} > {leaf['subcategory_label']}». "
                    "Παράδοση εντός συμφωνημένου χρονοδιαγράμματος, διαφανής τιμολόγηση και υποστήριξη μετά την ολοκλήρωση."
                ),
                "category": leaf["category"],
                "subcategory": leaf["subcategory"],
                "subdivision": leaf["subdivision"],
                "tags": [leaf["subdivision"], leaf["subcategory"], leaf["label"].lower().replace(" ", "-")],
                "fixed": fixed,
                "price": random.choice([2500, 4500, 6000, 8000, 12000, 18000, 25000, 40000, 60000]),
                "duration": random.choice([30, 45, 60, 90, 120]) if not fixed else 0,
                "type": random.choice(SERVICE_TYPE_OPTIONS),
                "addons": [],
                "faq": [],
                "media": media_resource(f"svc-{pro_idx}-{svc_idx}"),
                "featured": (pro_idx % 13 == svc_idx),
                "status": ServiceStatus.PUBLISHED,
                "sort_date": timezone.now(),
            },
        )
        # Now that the service has a numeric PK, build the real slug.
        final_slug = f"{leaf['subdivision']}-pro-{pro_idx:03d}-{svc_idx}-{service.id}"
        if service.slug != final_slug:
            service.slug = final_slug
            service.save(update_fields=["slug"])

    def _make_reviews(self, profile: Profile, consumers: list[User]) -> int:
        n = random.randint(0, 4)  # Some pros have no reviews; that's realistic
        for k in range(n):
            author = consumers[(profile.user_id.__hash__() + k) % len(consumers)]
            Review.objects.update_or_create(
                profile=profile, author=author,
                defaults={
                    "rating": random.choice([3, 4, 4, 5, 5, 5]),  # Bias positive
                    "comment": random.choice(REVIEW_COMMENTS),
                    "type": ReviewType.PROFILE,
                    "status": ReviewStatus.APPROVED,
                    "published": True,
                    "visibility": True,
                },
            )
        # Refresh aggregates
        agg = Review.objects.filter(profile=profile, published=True, visibility=True)
        cnt = agg.count()
        avg = sum(r.rating for r in agg) / cnt if cnt else 0
        profile.review_count = cnt
        profile.rating = round(avg, 2)
        profile.save(update_fields=["review_count", "rating"])
        return n
