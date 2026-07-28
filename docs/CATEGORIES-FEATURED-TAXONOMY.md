# How the Categories page, "Πιο δημοφιλείς εργασίες" & taxonomy resolution work

_Last updated: 2026-06-21 — written after fixing the category-page parity gaps._

This document explains three tangled things that caused a long string of bugs:

1. The **category page** (`/categories` and `/categories/<cat>`) — what the
   carousel and the cards are, and how each is filtered.
2. **"Πιο δημοφιλείς εργασίες"** — what it actually means (it is **featured**,
   not "most services").
3. The **taxonomy data model** — why the same name can render as a raw id
   (`YtDWfH`), why some pages came up empty, and how slug/id resolution works.

If you only remember one thing: **the carousel is _featured_ services; the cards
are _navigation_ and hide anything empty.** They are two different queries.

---

## 1. Anatomy of the category page

`/categories/<cat>` (e.g. `/categories/mathimata`) renders two regions:

```
┌─────────────────────────────────────────────────────────────┐
│  Πιο δημοφιλείς εργασίες        ← CAROUSEL  (featured)        │
│  [Μακιγιάζ] [Συμβ. Διατροφής] [Personal Training] …          │
├─────────────────────────────────────────────────────────────┤
│  Κατηγορίες                     ← CARDS     (navigation)     │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                │
│  │ Αισθητική  │ │ Διατροφή   │ │ Ευεξία     │  …             │
│  │ • Μακιγιάζ │ │ • Πρόγραμμα│ │ • Personal │                │
│  │ • Φρύδια   │ │   Διατροφής│ │   Training │                │
│  └────────────┘ └────────────┘ └────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

- **Top-level `/categories`** — one card per **category**; the card lists that
  category's **subcategories**.
- **`/categories/<cat>`** — drills down one level: one card per **subcategory**;
  each card lists that subcategory's **subdivisions**. A "Πιο δημοφιλείς
  εργασίες" carousel sits on top.

Data source: `getCategoriesPageData()` in
[`frontend/src/actions/services/get-categories.ts`](../frontend/src/actions/services/get-categories.ts),
which calls the Django endpoint `GET /api/services/categories` →
`get_categories_page()` in
[`backend/apps/services/selectors/service_reads.py`](../backend/apps/services/selectors/service_reads.py).

The backend returns three lists:

| field                | meaning                                                            | used for          |
| -------------------- | ----------------------------------------------------------------- | ----------------- |
| `subdivisions`       | **all** subdivisions that have ≥1 published service (`{slug,count,…}`) | hiding empty cards |
| `categories`         | `[{ slug: category, subcategories: [{slug,count}] }]` (all-service counts) | hiding empty cards |
| `popularSubdivisions`| subdivisions that contain **featured** services, ranked            | the carousel      |

---

## 2. "Πιο δημοφιλείς εργασίες" = FEATURED (this is the big one)

It is **not** "the subdivisions with the most services." It is **promoted
content**, set two ways (per the product owner):

1. **Admin** marks services as **featured** manually from the admin.
2. A **subscriber** (paid plan) can **star their own service** from their
   dashboard → it becomes `featured = true` (promoted).

So the carousel = **the subdivisions that contain featured services**, ranked by
how many featured services each has.

### Backend (`get_categories_page`)

```python
featured_grouped = (
    qs.filter(featured=True).exclude(subdivision="")
      .values("subdivision", "subcategory", "category")
      .annotate(count=Count("id")).order_by("-count")
)
# returned as `popularSubdivisions`
```

`Service.featured` is a real boolean column. There is **no** separate
"featured subdivision" table — featured lives on the **service**, and the
carousel is derived by grouping featured services per subdivision.

### Why an earlier attempt was wrong

`app_before_migrations/` (the OLD Next.js snapshot we use as a reference) builds
this carousel from a **raw service count** (`groupBy subdivision`, top 15). That
is an **older** version of the code. The **live** `doulitsa.gr` was changed to
use **featured**, which is why the live site shows ~5 curated items while a
count-based ranking showed 15–26. **The live site + the product owner win:
featured.** (`app_before_migrations` is stale on this one point.)

### Data divergence note

Our test DB is a **seed from a dump**, so _which_ services are starred differs
from the live site. Example: for `eveksia-frontida`, live shows 5 and our seed
shows 7 — **4 of the 5 overlap**. The **logic** matches; the exact set differs
because the **data** differs. Don't chase an exact match — chase the same logic.

---

## 3. The cards = navigation, and they HIDE EMPTY nodes

A card (or a subdivision listed inside it) must **not** link to a
"Δεν βρέθηκαν υπηρεσίες" page. So in `getCategoriesPageData()` we:

- build the visible tree from the **frontend taxonomy** (the full tree), then
- **drop** any subcategory / subdivision / category whose service count is 0,
  using the backend's all-service counts.

```ts
// hide a subcategory card with no services
const subCount = subcategoryCounts.get(sub.slug) ?? 0;
if (subCount <= 0) continue;
// hide an empty subdivision inside a card
divs.filter(d => (subdivisionCounts.get(d.slug) ?? 0) > 0)
```

### Why counts are keyed by SLUG and AGGREGATED (not by id)

The taxonomy has **slug collisions**: the same human name exists as two nodes
with the **same slug** but **different ids**. Real examples in live data:

| label                  | subcategory id | subdivision id | shared slug            |
| ---------------------- | -------------- | -------------- | ---------------------- |
| Σχολικά Μαθήματα        | `LJFkDj`       | `I4GuUq`       | `sxolika-mathimata`    |
| Μαθήματα Πληροφορικής   | `1x3lBH`       | `MHv2I6`       | `mathimata-pliroforikis` |

Services are stored against **either** id. If we keyed counts by **id**, a
node's services stored under the _other_ colliding id would be invisible, and a
non-empty subcategory would be wrongly hidden (the "multiple missing" bug). So
we resolve every stored value to its **canonical slug** and **sum**:

```ts
const canonical = v => (findServiceById(v) ?? findServiceBySlug(v))?.slug ?? v;
bump(subcategoryCounts, canonical(sub.slug), sub.count); // aggregate by slug
```

---

## 4. Taxonomy slug/id resolution (the root of most bugs)

`services.category / subcategory / subdivision` store **one of**:

- a **cuid id** — e.g. `YtDWfH` (live/restored data), or
- a **slug** — e.g. `eveksia-frontida` (demo seed), or occasionally
- a **name**.

URLs always use **slugs**. So every taxonomy filter must match **slug OR id**.
This is `taxonomy_value_candidates()` in
[`backend/apps/core/taxonomy.py`](../backend/apps/core/taxonomy.py):

```python
taxonomy_value_candidates("sxolika-mathimata")
#   → ["sxolika-mathimata", "I4GuUq", "LJFkDj"]   (slug + ALL ids sharing it)
```

### The collision fix (why archives were empty)

The resolver originally built `slug → id` from `bySlug`, which is keyed by slug
and therefore **collapses a collision to a single id**. So
`/ipiresies/mathimata-pliroforikis` resolved to only `1x3lBH`, missed the 5
services stored under `MHv2I6`, and rendered **empty** — even though the live
site had results.

Fix: build `slug → [ids]` from **`byId`** (which holds every node) so a slug
expands to **every** id that carries it. Now the `__in` filter matches all
colliding ids and the archive is no longer empty. This single resolver feeds
the archive pages, the category-page counts, and search — so they all stay
**consistent** (a card shows ⇔ its archive has results).

### Why cards/labels sometimes showed raw ids (`YtDWfH`)

When the backend ships a stored **id** and the frontend looks it up **by slug
only**, the lookup misses and the raw id leaks to the UI. Fix everywhere:
resolve **by slug OR id** (`findServiceBySlug(v) ?? findServiceById(v)`), across
the service **and** pro taxonomies. See `get-profile.ts`, `get-service.ts`,
`get-categories.ts`.

---

## 5. End-to-end data flow

```
URL slug ──▶ Next.js page (force-dynamic)
              └─▶ getCategoriesPageData()            [FE action]
                    ├─ GET /api/services/categories  ─▶ get_categories_page()   [Django selector]
                    │        ├─ qs filtered by _taxonomy_candidates(category)    (slug OR id, collisions)
                    │        ├─ subdivisions      = all-service counts
                    │        ├─ categories        = subcategory all-service counts
                    │        └─ popularSubdivisions = FEATURED grouped by subdivision
                    └─ import('@/lib/taxonomies')   [FE taxonomy tree, for labels/slugs]
                         ├─ carousel  ← popularSubdivisions, resolved to labels/hrefs
                         └─ cards     ← taxonomy tree, MINUS nodes with count 0
```

Archive click (`/ipiresies/<sub>` or `/ipiresies/<sub>/<div>`):

```
getServiceArchivePageData() ─▶ _apply_filters()
   subcategory/subdivision filtered by _taxonomy_candidates(slug)  (matches all colliding ids)
```

---

## 6. Files that implement this

| Concern                              | File |
| ------------------------------------ | ---- |
| Category page action (carousel+cards)| `frontend/src/actions/services/get-categories.ts` |
| Backend category-page selector       | `backend/apps/services/selectors/service_reads.py` → `get_categories_page`, `_categories_with_counts` |
| Slug/id + collision resolver         | `backend/apps/core/taxonomy.py` → `taxonomy_value_candidates`, `_slug_to_ids`, `_id_to_slug` |
| Archive filtering                    | `backend/apps/services/selectors/service_reads.py` → `_apply_filters`, `_taxonomy_candidates` |
| Frontend taxonomy tree + lookups     | `frontend/src/lib/taxonomies/*` (`findServiceBySlug`, `findServiceById`) |

---

## 7. Gotchas / how to verify

- **Top categories**: `dimiourgia-periexomenou, ekdiloseis, eveksia-frontida,
  mathimata, marketing, pliroforiki, texnika, ypostiriksi`. Note **`marketing`**
  (not `marketingk`).
- **Rate limit**: hammering `/categories/*` in a loop returns
  `Request was throttled` (surfaces as a 500 on the page). It is **not** a data
  bug — space requests out or query the selector directly in `manage.py shell`.
- **Verify a category** (no HTTP throttle):
  ```bash
  docker exec django-backend-backend-1 python -c "import django,os; \
    os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings.dev'); django.setup(); \
    from apps.services.selectors.service_reads import get_categories_page as g; \
    d=g(category_slug='mathimata'); print('subcats', sum(len(c['subcategories']) for c in d['categories']), \
    'featured', len(d['popularSubdivisions']))"
  ```
- **Verify an archive isn't wrongly empty**:
  ```bash
  docker exec django-backend-backend-1 python -c "import django,os; \
    os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings.dev'); django.setup(); \
    from apps.core.taxonomy import taxonomy_value_candidates as c; \
    from apps.services.models import Service; \
    print(Service.objects.filter(status='published', subcategory__in=c('mathimata-pliroforikis')).count())"
  ```

> **Deploy note:** the backend changes (`taxonomy.py`, `service_reads.py`) need a
> **backend** redeploy (Daphne has no autoreload), and the frontend change needs
> a **frontend** redeploy. Both, or the behavior won't match what's described here.
