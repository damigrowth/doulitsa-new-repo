# Pass 6: live E2E check of public flows on test.doulitsa.gr (2026-11-05)

**Method.** I drove headless Chromium (playwright-core 1.64 with the cached headless shell) at a 1366x900 desktop size and a 390x844 mobile size (isMobile/hasTouch). I also ran curl GETs.

- **Test environment:** anonymous use only. I did not log in or submit any form. The only POSTs were read-only `/search` and `/count` calls to the public API (LC-3).
- **Old production (`doulitsa.gr`):** anonymous, read-only GETs and client-side UI browsing only, used for comparison.
- **Data caveat:** the test database is smaller than production. Sitemap counts are services 705 vs 950 and profiles 395 vs 596. Because of this, differences in result counts or in which items appear are **not** treated as bugs unless the mechanism is clear.

Verdicts: **REPRODUCED**, **PARTIAL** or **NOT-REPRODUCED**. Entries tagged **NEW** were not in MASTER-FINDINGS.

---

## 1. Search suggestions (header dropdown + `GET api-test…/api/services/search/suggestions?q=`)

The dropdown renders exactly what the API returns. A screenshot of "seo" shows only a "ΥΠΗΡΕΣΙΕΣ" block with no taxonomy block.

| Check | MASTER | Verdict | Evidence |
|---|---|---|---|
| "seo", "social media", "branding", "digital marketing" | P1-18 (HST D1) | **REPRODUCED** | `taxonomies: []` for all four. Only service hits come back, matched on title or description. Expected taxonomy hits are missing, e.g. SEO → `/ipiresies/digital-marketing/seo`, which exists and is populated. |
| "μάρκετινγκ" | P1-18 | **REPRODUCED** | The only taxonomy hit is `E-books Μάρκετινγκ` (category Υποστήριξη). No entry comes from the Μάρκετινγκ category itself. |
| Control: "wordpress", "δίκτυ", "διαφημ" | – | Works | Non-Marketing taxonomy suggestions do appear, e.g. `Ιστοσελίδα Wordpress` → `/ipiresies/kataskeui-istoselidon/istoselida-wordpress`. |
| Tag-only search | P1-20 | **REPRODUCED** | Service 760 has tags `['23','32','39','58','268','710']`; tag 32 is "Adobe Flash". "adobe flash" gives 0 suggestions. Archive `/ipiresies?search=adobe%20flash`: **new = empty ("Δεν βρέθηκαν")**, **old = "1-2 από 2", includes /s/…-760**. "2d animation" still finds 760, but only through its title. |
| Colliding-slug duplicate suggestions | P1-18 (pass-4 adjusted note) | **PARTIAL** | "υδραυλικ" returns `Υδραυλικά|Τεχνικά|/ipiresies/udraulika/udraulika` plus `Υδραυλικά|Τεχνικά|/ipiresies/udraulika`. "καθαρισμ" and "επισκευ" show the same pattern. Both entries have the **correct** category label (Τεχνικά), so the "wrong category label" sub-claim does not show live. Whether OLD also showed the same-named subdivision could not be checked without a POST server action on prod. |
| "δασκάλα" in service suggestions | – | No leakage | Returns `taxonomies: []` and services matched on title or tags. |
| "δασκάλα" in directory search | P3-12 | **REPRODUCED** | `/dir?search=δασκάλα`: new returns 10, old returns 9. The only extra profile is "Ιδιαιτερα μαθηματα Αγγλικων", subcategory **Δάσκαλος** (the masculine sibling variant). |

## 2. `/dir` filter drawer (390x844 mobile)

| Check | MASTER | Verdict | Evidence |
|---|---|---|---|
| Categories list | – | OK | 9 options: "Όλες οι κατηγορίες" plus the 8 categories. |
| Subcategory with no category | – | Parity | Disabled on both new and old. |
| Subcategory dropdown capped / count-ordered | P1-13 | **REPRODUCED** | `/dir/texnika`: new has **10** subcategories, count-ordered (Ηλεκτρολόγοι, Κηπουροί, Τεχνικοί…). Old has **19 or more**, alphabetical (Αποφρακτικές Εταιρείες, Αρχιτέκτονες, Αρχιτέκτονες Τοπίου…). `/dir/ekpaideysi-and-didaskalia`: new 9, old 18. |
| `/dir` root pills link to `/dir/<sub>` | P1-12 | **REPRODUCED** | New root pills: `/dir/kathigites-xenon-glosson`, `/dir/kathigites`, `/dir/daskaloi-mousikis`, `/dir/digital-marketing-agencies`, `/dir/ekpaideutikoi`. Old: `/dir/ekpaideysi-and-didaskalia/kathigites-xenon-glosson` etc. `/dir/kathigites-xenon-glosson` returns HTTP 200 with a banner but **0 profiles and no count line**. The proper URL shows "1-20 από 34". Old's `/dir/<sub>` is equally empty, but old never linked to it. |
| Pill labels singular | P2-19 | **REPRODUCED** | New: "Ηλεκτρολόγος", "Κηπουρός", "Καθηγητής". Old: "Ηλεκτρολόγοι", "Κηπουροί", "Καθηγητές". On `/dir/ekpaideysi-and-didaskalia/kathigites-xenon-glosson` the new page shows two pills to `/kathigites`, labelled "Καθηγητής" and "Καθηγήτρια". Old also duplicates that pill, but with the plural label. |
| Wrong gender/variant node | P2-19 | **REPRODUCED (NEW manifestation)** | `/dir/digital-marketing-agencies`: the new banner text is the **Social Media Agency** description, and the last crumb reads "Social Media Agency". Old shows the Digital Marketing Agency description. Cause: 3 pro nodes share the slug `digital-marketing-agencies` (gqvOTm, OMSwJr, jNTU60). |
| Drawer stays open and updates instantly on category change (October fix) | – | **Works** | After choosing "Εκπαίδευση": the dialog stayed open (count 1 at every 300 ms sample for 3 s). The URL changed to `/dir/ekpaideysi-and-didaskalia` within 300 ms and the subcategory dropdown filled in. No console errors. |

## 3. Colliding service slugs (desktop + mobile; banner text and image compared with old)

| Path | MASTER | Verdict | New banner / image | Old banner / image |
|---|---|---|---|---|
| `/ipiresies/udraulika` | P1-18 (N2b) | **REPRODUCED** | "Βρες άμεσα λύσεις για κάθε υδραυλικό πρόβλημα…" / `497_6674a551e9` | "…για υδραυλικά προβλήματα στο σπίτι σου με εξειδικευμένες υπηρεσίες επισκευής." / `subcategories/udraulika_vd7zoz` |
| `/ipiresies/katharismoi` | P1-18 | **REPRODUCED** | "Βρες άμεσα υπηρεσίες καθαρισμού…" / `431_c11257ca7d` | "Καθάρισε το χώρο σου άμεσα…" / `subcategories/katharismoi_ngupkr` |
| `/ipiresies/episkeues` | P1-18 | **REPRODUCED** | "Βρες άμεσα λύσεις για κάθε τεχνική βλάβη. Επισκευές που αποκαθιστούν…" / `412_4c48458104` | "Βρες άμεσα λύση… σωστή αποκατάσταση…" / `subcategories/episkeues_yqtbws` |
| `/ipiresies/digital-marketing` | P1-18 | **REPRODUCED** | "…στρατηγικές που προσελκύουν και διατηρούν το κοινό σου." / `264_c994b7e5e5` | "…στρατηγικές digital marketing που προσελκύουν και αυξάνουν τους πελάτες." / `subcategories/digital-marketing_lffcpk` |
| `/categories/marketing` | P1-18 (N2) | **REPRODUCED** | "Ανακάλυψε στρατηγικές μάρκετινγκ…" / `marketing_449289d8e0` | "Ανάπτυξε την επιχείρησή σου με Στρατηγική Μάρκετινγκ, Digital Marketing Ads και Social Media." / `digital_agencies_ellada_3389c8ec8e` |

On all four subcategory pages the `<meta name=description>` **matches old**. Only the visible banner subtitle and the image are wrong.

**Mobile "Κατηγορίες Υπηρεσιών" highlight (pass3-services P3-S1):** **REPRODUCED**, and it is not limited to colliding slugs.
- `/ipiresies/kataskeui-istoselidon`: new highlights "Όλες οι Κατηγορίες"; old highlights "Πληροφορική".
- `/ipiresies/udraulika`: new highlights "Όλες οι Κατηγορίες"; old highlights "Τεχνικά".

**Service drawer and carousel (P1-14):** **REPRODUCED**.
- **`/ipiresies/digital-marketing` subdivision dropdown:** new has 7 entries, count-ordered. Old has 9, alphabetical, including "Διαφημίσεις CPC" and "Διαφημίσεις Facebook".
- **Root `/ipiresies` carousel:** new shows 8 pills, old shows 20. New also omits "Κατασκευή Ιστοσελίδας", which `/categories` on test does show.
- **`/ipiresies/digital-marketing/seo` pills:** new includes the current "SEO" item; old excludes it.

**Service sidebar category list order (P2-22):** **REPRODUCED**. New is count-ordered (Ξένες Γλώσσες, Εκπαίδευση, Μαθήματα Μουσικής…). Old follows taxonomy order (Βίντεο, Εκτυπώσεις, Ήχος…).

## 4. Soft-404s

Status codes were the same for a browser user agent, curl and Googlebot.

| URL | New | Old | Verdict |
|---|---|---|---|
| `/ipiresies/zz-nope` | **200** | 404 | **PARTIAL** (P1-18 / routes D1) |
| `/categories/zz-nope` | **200** | 404 | **PARTIAL** |
| `/ipiresies/udraulika/zz-nope` | **200** | 404 | **PARTIAL** |
| `/ipiresies/zz-nope/zz-nope` | **200** | – | **PARTIAL** |
| `/dir/udraulika` (a service slug under the pro route) | **200** | 404 | **PARTIAL** (P1-12) |
| `/dir/zz-nope` | 404 | 404 | Parity |
| `/dir/zz-nope/zz-nope` | 404 | – | OK |
| `/s/zz-nope` | 200, home-page title | 200, same | Parity (old bug) |
| `/profile/zz-nope` | 200, "404 - Προφίλ δεν βρέθηκε" | 200, same | Parity |
| `/categories/udraulika` (a subcategory slug as a category) | 200 with content | 200 with content | Parity |

**Correction to MASTER's wording.** These pages are **not** "200 with an empty archive". The real not-found UI renders: "Ουπς! Η κατηγορία δεν βρέθηκε", `<title>404 - …`, and `meta robots=noindex`. Only the **HTTP status** is 200 instead of OLD's 404. `notFound()` fires, but after the response has already started. The route files have no `loading.tsx`, and `/dir/zz-nope` does return 404, so the cause is likely tied to the path through `generateMetadata` and the data fetch. The SEO impact is limited by the `noindex`.

## 5. Archive search term (`/ipiresies?search=λογιστης`)

**P1-15: REPRODUCED.**

| Step | New | Old |
|---|---|---|
| Initial load | "1-12 από 12", but **both archive search inputs are empty** | Both inputs show "λογιστης" |
| Sort changed to "Πιο Πρόσφατα" | URL becomes `/ipiresies?sortBy=recent`, **search dropped**, "1-20 από **705**" | `?search=λογιστης&sortBy=recent&limit=20`, still 12 |
| County changed to Αττική | `?sortBy=recent&county=attiki`, 318 results | `…&county=attiki`, 1 result |

`/dir?search=` keeps its input value on new (profiles are not affected).

## 6. Breadcrumbs

| Page | MASTER | Verdict | Evidence |
|---|---|---|---|
| `/ipiresies/*`, `/ipiresies/<sub>/<div>` | P3-15 (LC-14) | **REPRODUCED** | Base crumb "Υπηρεσίες" links to `/ipiresies` on new and to `/categories` on old. The rest of the trail matches, e.g. `/categories/texnika:Τεχνικά` then an unlinked Υδραυλικά. |
| `/dir/*` | P3-15 | **REPRODUCED** | Base crumb "Επαγγελματικός Κατάλογος" links to `/dir` on new and to `/directory` on old. On `/dir` itself, new renders the base crumb **linked to itself**; old leaves it unlinked. |
| `/dir/<cat>/<sub>` last crumb | P2-19 | **REPRODUCED** | New: "Καθηγητής Ξένων Γλωσσών" (singular). Old: "Καθηγητές Ξένων Γλωσσών". |
| Profile pages | – | **Parity** | `/profile/depyart`: `/directory` → `/dir/ekpaideysi-and-didaskalia` → `/dir/…/kathigites-xenon-glosson` with plural labels, identical to old. |
| Service pages | P3-16 | **Parity** for this sample | `/s/…-760`: `/categories/dimiourgia-periexomenou` → `/ipiresies/video` → `/ipiresies/video/animated-video`, identical. |

## 7. Public profile page (`/profile/depyart`, `/profile/lg1111`, `/profile/damiprofs`)

**Rendered page: parity with old.** For depyart, these all match old (canonical host aside): title, OG tags, h1, sections, JSON-LD LocalBusiness and breadcrumbs. Old also puts raw HTML (`<p>…`) in `meta description`, so that is not a regression. No `mailto:` links, no console errors and no broken images.

**P1-1: PARTIAL.**
- **Not reproduced in the HTML.** The Next.js HTML and RSC payload do **not** contain the email: 0 matches for the address, and no `firstName` or `lastName` keys.
- **Reproduced on the API host.** `GET https://api-test.doulitsa.gr/api/profiles/page/{username}` (anonymous, 200) returns `profile.email` and `profile.user.email` even though `visibility.email: false`. Checked for damiprofs, lg1111 and depyart. The Django host is publicly routed, so the leak is real for anyone who calls the API directly.
- `firstName`/`lastName` were null in every sampled payload, including `/api/home` (0 non-null), so the name-leak part could not be shown on test data.

**`/profile/damiprofs`** exists only on test (old returns its 404 page). Its bio repeats "Master of the universe" 10 times; this is test data.

## 8. Public service page (`/s/motion-design-2d-animation-vfx-760`)

**P1-16: REPRODUCED.**

| Field | New | Old |
|---|---|---|
| `meta description` and `og:description` | `" -  - Δημιουργία motion graphics και 2D animations, με After Effects, VFX, explainer videos, καθώ..."` | `"Βίντεο - Animated Video - Δημιουργία motion graphics…"` |
| JSON-LD `Product.description` | Same broken `" -  - …"` | `"Βίντεο - Animated Video - …"` |

Everything else in the JSON-LD matches old: name, image (an .mp4 URL in both), brand, manufacturer (Person "Motionspets"), and offers with price 0 and InStock. Title, h1 and breadcrumbs match.

## 9. Sitemaps, robots, API host

**Sitemaps on test.** `/sitemap.xml` (cache-control max-age 3600) and the child sitemaps (`max-age=0, must-revalidate`) all return 200 `application/xml`, the same headers as old.

| Child sitemap | Old URLs | New URLs | Only in old | Only in new |
|---|---|---|---|---|
| dir | 181 | 147 | 34 | 0 |
| ipiresies | 315 | 277 | 40 | 2 |
| categories | 8 | 8 | 0 | 0 |
| s | 950 | 705 | 253 | 8 |
| profile | 596 | 395 | 205 | 4 |
| articles | 15 | 15 | 0 | 0 |

Most of the gap comes from data volume. Examples of dir URLs missing on new: `/dir/dimioyrgia-periexomenoy/copywriters`, `/grafistes`, `/metafrastes`. These follow from fewer profiles on test.

**NEW (LOW, environment):** the test index `/sitemap.xml` lists `https://doulitsa.gr/...` child URLs (hardcoded prod host), while the child sitemaps use `test.doulitsa.gr`.

**API host (P3-41 / LC-6 / lib D16): REPRODUCED on test.**

| URL | Result |
|---|---|
| `api-test…/api/docs/` | 200 |
| `/api/schema/` | 200, 183 KB OpenAPI |
| `/api/redoc/` | 200 |
| `/django-admin/` | 302 to the login page |
| `/django-admin/login/` | 200, login form |
| `/sitemap_index.xml` | Lists only s, profile and articles (LC-8 confirmed) |
| `/robots.txt` | 404 |
| `/api/health` | 200, `{"ok":true,"db":true,"redis":true,"celery":true}` |

**Other live checks:**

| Check | MASTER | Verdict | Evidence |
|---|---|---|---|
| LC-3 services | P1-2 | **REPRODUCED** (search) | `POST /api/services/search {"status":"draft"}` returns `total 3`, all `status: draft` (e.g. ids 783, 575). Baseline: 705, all published. `/api/services/count` ignores the override and returns 705 for draft, pending and rejected, so the "/count" half is **NOT-REPRODUCED**. |
| LC-3 profiles | P1-3 | **PARTIAL** | `POST /api/profiles/search {"published":false}` returns total 0 (baseline 395), so the override is accepted but no unpublished rows are visible on test. `/count` ignores it (395). |
| LC-4 traversal | P3-3 | **REPRODUCED** | `GET /api/auth/%252E%252E/%252E%252E/api/health` returns 200 `{"ok":true,…}`. The single-encoded variant returns 404. |
| LC-7 | P2-45 | **REPRODUCED** | `GET /api/auth/reset-password/abc123` returns a 404 JSON `not_implemented` body with the full `supported` endpoint map. |
| `/articles/marketingk` (LC-9) | P1-22 | **REPRODUCED** | 404 on new. |
| `/pros` | – | Parity | 308 to `/dir` on both. |

## 10. Anything else

1. **Console, hydration, network sweep: clean.** 25 public URLs × 2 viewports (home, `/ipiresies`, `/categories`, `/categories/{marketing,texnika}`, colliding archives, `/dir`, `/directory`, `/dir/texnika[/ilektrologoi]`, 2 profiles, 2 services, `/articles`, `/about`, `/faq`, `/contact`, `/pros`, `/terms`, `/privacy`, `/s/zz-nope`, `/login`, `/register`). Results: **0** console errors or warnings captured as errors, **0** page errors or hydration errors, **0** requests ≥400 or failed, **0** broken non-lazy images, **0** horizontal overflow at 390 px.
2. **NEW (LOW, environment): test.doulitsa.gr is fully indexable.**
   - `robots.txt` is byte-identical to prod: `Allow: /`, `Host: https://doulitsa.gr`, `Sitemap: https://doulitsa.gr/sitemap.xml`.
   - The home page has no `meta robots` and no `X-Robots-Tag`.
   - Canonicals point at `https://test.doulitsa.gr/...`.
   - Risk: duplicate-content indexing of the test host before cutover. Confirm whether this is intentional (e.g. Dokploy basic-auth is not in front of it).
3. **Parity notes (old bugs, not regressions):** "| Doulitsa | Doulitsa" double title suffix on `/ipiresies`, `/categories`, `/articles`, `/dir`, `/directory`, `/login`; raw HTML in profile meta descriptions; `/s/<garbage>` and `/profile/<garbage>` returning 200.
4. **Not regressions:** the `/dir` drawer October fix (stays open, instant URL change) and the disabled subcategory control with no category both work.

## Summary of verdicts

**REPRODUCED:** P1-2 (search half), P1-12, P1-13, P1-14, P1-15, P1-16, P1-18 (suggestions, banners, `/categories/marketing`, mobile highlight), P1-20, P1-22 (LC-9), P2-19 (labels + the `digital-marketing-agencies` variant), P2-22, P2-45, P3-3, P3-12, P3-15, P3-41.

**PARTIAL:**
- P1-1: the email leaks on the public API host, not in the Next HTML.
- P1-3: the override is accepted but returns 0 rows on test.
- P1-18 soft-404 part: the 404 UI and noindex render, only the HTTP status is 200.
- P1-18 duplicate suggestions: present, but category labels are correct.

**NOT-REPRODUCED:** P1-2 / P1-3 "/count accepts the override" (count ignores it).

**NEW:**
- Test host indexable, with prod host in robots and the sitemap index.
- `/dir` base crumb self-linked on `/dir`.
- Live evidence of P2-19 on `/dir/digital-marketing-agencies` (Social Media Agency text).
