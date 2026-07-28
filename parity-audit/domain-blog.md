# Doulitsa Migration Parity Audit

## Domain: Blog

Scope: OLD `src/actions/blog/{get-articles,get-article,manage-articles}.ts` + Prisma `blog_articles` / `blog_article_authors` (RLS: public read of published, admin manages) vs NEW `backend/apps/blog/**` + `frontend/src/actions/blog/**` + `frontend/src/lib/api/{blog,admin}.ts`.

OLD route mounting: server actions only (no REST). NEW mounts public at `/api/blog/` and admin at `/api/admin/blog/` — `backend/config/urls.py:41,57`.

---

### Parity matrix

| Capability | Category | OLD (file:line) | NEW (file:line) | Status | Notes |
|---|---|---|---|---|---|
| List published articles (public) | Endpoint | get-articles.ts:44-103 (`_getArticles`) / 108-130 (`getArticles`) | services/articles.py:23-59 `list_published_articles`; views/public/article.py:12-23; urls/public.py:15; FE lib/api/blog.ts:4-11; FE action get-articles.ts:7-20 | ✅ | published-only filter present (services:37). |
| Get article by slug (public) | Endpoint | get-article.ts:14-54 / 59-75 | services/articles.py:62-72 `get_published_article`; views/public/article.py:40-47; urls/public.py:17; FE blog.ts:13-14; FE get-article.ts:7-16 | ✅ | published-only enforced (services:67). 404→`data:null` in FE action (get-article.ts:11-13). |
| Related articles (same category) | Endpoint | get-articles.ts:135-152 / 157-181 | services/articles.py:75-82 `get_related`; views/public/article.py:26-37; urls/public.py:16; FE blog.ts:16-17 | ⚠️ | NEW resolves category from slug server-side (view:30-33); OLD took `categorySlug` as a caller arg. Behaviorally equivalent. Default limit=4 both. |
| List by category (public) | Filter | get-articles.ts:56-58 (`categorySlug`) | services/articles.py:38-39; view:19 | ✅ | exact match. |
| List by author (public) | Filter | get-articles.ts:60-64 (`authors.some.profileId`) | services/articles.py:45-46 (`authors_through__profile_id` + distinct); view:20 | ✅ | exact match. |
| List by tag | Filter | n/a (OLD has no tags) | n/a | ✅ | OLD blog has no tag concept. |
| Featured filter (public) | Filter | get-articles.ts:66-68 | services/articles.py:40-41; view:21 + `_bool` parse:50-53 | ✅ | match. |
| Search (public) | Filter | get-articles.ts:70-75 (OR titleNormalized/title `contains`, insensitive) | services/articles.py:42-44 | ⚠️ | DIVERGENCE: OLD = single `contains` on titleNormalized OR raw title; NEW splits search into words and ANDs `title_normalized__icontains` per word, and drops the raw-`title` branch. Different result sets. |
| Pagination (public) | Pagination | get-articles.ts:48-50,88,96 (page,limit default 12; skip; totalPages; hasMore) | services/articles.py:48-57 | ⚠️ | NEW returns `page`, OLD returns `hasMore`. NEW omits `hasMore`; OLD omits `page`. Response-shape mismatch (see below). |
| Order (public list) | Sort | get-articles.ts:81 (`publishedAt desc`) | services/articles.py:37 (`-published_at`) | ✅ | match. |
| Admin list (all statuses) | Endpoint | manage-articles.ts:234-308 `listArticlesAdmin` | services/articles.py:119-136 `list_admin`; views/admin/article.py:23-30; urls/admin.py:14; FE admin.ts:151-152; FE manage-articles.ts:41-53 | ⚠️ | works, but author nesting dropped (see gaps). |
| Admin get one | Endpoint | manage-articles.ts:313-349 `getArticleAdmin` | services/articles.py:139-143 `get_admin`; views/admin/article.py:45-49; FE admin.ts:154; FE manage-articles.ts:55-57 | ⚠️ | authors profile shape differs (see gaps). |
| Admin create | Endpoint | manage-articles.ts:18-90 `createArticle` | services/articles.py:146-173 `create_article`; views/admin/article.py:32-39; FE admin.ts:153; FE manage-articles.ts:28-30 | ⚠️ | several business-rule gaps (category/author validation, slug strategy). |
| Admin update | Endpoint | manage-articles.ts:95-190 `updateArticle` | services/articles.py:176-212; views/admin/article.py:51-58; FE admin.ts:155 | ⚠️ | category/author validation missing; publishedAt-on-publish OK. |
| Admin delete | Endpoint | manage-articles.ts:195-229 `deleteArticle` | services/articles.py:215-222; views/admin/article.py:60-64; FE admin.ts:156 | ✅ | 204; cascade via FK. |
| Admin status filter | Filter | manage-articles.ts:256-258 | services/articles.py:122-123 | ✅ | NEW also treats `status=="all"` as no-filter (extra, harmless). |
| Admin search | Filter | manage-articles.ts:262-267 (title OR titleNormalized, insensitive) | services/articles.py:126-127 (title OR **slug**) | ⚠️ | DIVERGENCE: OLD searches title/titleNormalized; NEW searches title/**slug** (drops normalized, adds slug). Accent-insensitive admin search lost. |
| Admin pagination | Pagination | manage-articles.ts:250-252 (limit default 20) | services/articles.py:119 (limit 20); view:25 | ✅ | match. |
| Admin order | Sort | manage-articles.ts:289 (`createdAt desc`) | services/articles.py:121 (`-created_at`) | ✅ | match. |
| Status enum | Schema | service.prisma:9-17 (7 values) | models/blog_article.py:10-16 `BlogStatus` (6 values) | ⚠️ | NEW enum drops `approved`? No — NEW has approved+rejected+inactive but **OLD `Status` has `approved` too**; NEW `BlogStatus` = draft/pending/published/rejected/approved/inactive (6). OLD `Status`=7 (includes those 6 minus none... see gap). Validation enums differ from OLD blog Zod (3 only). |
| Slug generation | Business rule | manage-articles.ts:45 (`createSlug(title)-Date.now(36)`) | services/articles.py:153-155 (`create_slug` + `find_next_slug_variant`) | ⚠️ | DIVERGENCE in collision strategy (timestamp suffix vs `-2/-3`). |
| publishedAt on first publish | Business rule | create:58; update:139-147 | create:168; update:198-200 | ✅ | match. |
| Author linking | Business rule | create:59-68; update:157-170 | create:170-171; update:207-210 | ✅ | delete-all + recreate with order index. Match. |
| categorySlug validation | Business rule | create:27-29; update:105-107 (`getBlogCategoryBySlug`) | — none — | ❌ | NEW accepts any string; static-category check missing. |
| Author-profile existence check | Business rule | create:32-42; update:110-120 | — none — | ❌ | NEW does not verify profiles exist; bad IDs → silent/FK-less rows (db_constraint=False). |
| titleNormalized maintained | Business rule | create:51; update:127 | create:161; update:184 | ✅ | match (normalize_term mirrors). |
| Authorization: public read published | AuthZ (RLS) | RLS + status check (get-article.ts:42) | AllowAny + status filter (views/public/article.py:13,27,41) | ✅ | RLS parity via query filter. |
| Authorization: admin view/edit/full | AuthZ | view=list/get; edit=create/update; full=delete (manage-articles.ts:22,99,199,248,317) | view/edit/full via HasResourcePermission (views/admin/article.py:15-17,21,34,43,53,61) | ✅ | level mapping matches OLD helper (admin/helpers.ts:50-71). |
| Validation: max lengths / min lengths | Validation | blog.ts:16-33,39-64 (title≤200, excerpt≤500, publish min title 5 / content 50 / category required) | serializers/article.py:9-27 | ⚠️ | NEW differs: title≤512 not 200; content min 20 not 50; title min 3 not 5; excerpt≤4000 not 500; no publish-time "category required" refinement. |

---

### Detailed gaps (per ❌/⚠️)

#### ❌ 1. categorySlug not validated against static category list
- OLD: `createArticle` / `updateArticle` reject unknown category — `getBlogCategoryBySlug` returns 13 fixed slugs (manage-articles.ts:27-29,105-107; blog-categories.ts:14-35).
- NEW: no check anywhere in `backend/apps/blog/` (grep confirms no static categories in backend); `create_article`/`update_article` store `categorySlug` verbatim (services/articles.py:165,191-194).
- Impact: admins can save articles with invalid/typo categories; archive pages filtered by category silently return empty. Also OLD publish refinement makes category mandatory for non-draft (blog.ts:57-63) — NEW never enforces.
- Fix: port `BLOG_CATEGORIES` to a Python constant in `apps/blog/constants.py`; in `create_article`/`update_article` raise `FieldErrors({"categorySlug": [...]})` when slug not in set; enforce required-on-publish.

#### ❌ 2. Author-profile existence not validated
- OLD: both create and update fetch profiles by id and return error listing missing ids (manage-articles.ts:32-42,110-120).
- NEW: `create_article`/`update_article` blindly `BlogArticleAuthor.objects.create(profile_id=author_id)` (services/articles.py:170-171,209-210); FK has `db_constraint=False` (models/blog_article.py:51-52) so DB won't reject either.
- Impact: dangling author rows with non-existent profile ids; `_authors_of` later returns `None`-filled author entries.
- Fix: validate `Profile.objects.filter(id__in=authors)` count/ids before linking; raise `FieldErrors` with the missing ids.

#### ⚠️ 3. Public-list search semantics changed
- OLD: `WHERE titleNormalized ILIKE %q% OR title ILIKE %q%` (single term, two columns) (get-articles.ts:70-75).
- NEW: splits query into words, `normalize_term` each, ANDs `title_normalized__icontains` per word; raw-`title` column dropped (services/articles.py:42-44).
- Impact: multi-word queries behave differently (AND vs substring); a query matching only the un-normalized `title` (e.g. accented form) no longer matches. Result sets differ.
- Fix: replicate OLD single-term OR over `title_normalized` and `title`, or normalize the query once and match `title_normalized__icontains=normalize_term(search)`.

#### ⚠️ 4. Admin-list search column changed
- OLD: title OR titleNormalized, insensitive (manage-articles.ts:262-267).
- NEW: title OR **slug** (services/articles.py:126-127) — drops `title_normalized`, adds `slug`.
- Impact: accent-insensitive admin search lost; slug search is a new (untracked) behavior.
- Fix: match OLD `Q(title__icontains) | Q(title_normalized__icontains)`.

#### ⚠️ 5. Admin list & get author payload dropped / reshaped
- OLD admin list (`listArticlesAdmin`) and `getArticleAdmin` include `authors` with `{profileId, order, profile:{id,displayName,image,username}}` (manage-articles.ts:272-288,321-337).
- NEW `list_admin` returns `_card(a)` which has **no `authors` key at all** (services/articles.py:133, `_card` 85-98). NEW `get_admin` does include authors but via `_authors_of` which omits `profileId`/`order` and uses the public detail author shape `{id,username,displayName,image,authorBio}` (services:101-113).
- Impact: admin list UI can't render author avatars/names (key absent); admin edit form gets a different author object than OLD (no `order`, no `profileId`, plus extra `authorBio`). Likely breaks the admin authors picker.
- Fix: add an admin-specific author serializer returning `{profileId, order, profile:{id,displayName,image,username}}` and attach to both `list_admin` and `get_admin`.

#### ⚠️ 6. Public detail author shape missing 3 fields
- OLD `getArticle` author profile select includes `authorBio, subcategory, rating, reviewCount` (get-article.ts:30-36; types/blog.ts:50-60).
- NEW `_authors_of` returns only `{id,username,displayName,image,authorBio}` — **drops `subcategory`, `rating`, `reviewCount`** (services/articles.py:106-112). Confirmed these columns exist on NEW Profile (profiles/models/profile.py:52,103,104), so it's an omission not a schema gap.
- Impact: AuthorBox on article detail page loses subcategory/rating/review-count display.
- Fix: add `subcategory`, `rating`, `reviewCount` to the `_authors_of` payload.

#### ⚠️ 7. Public list/related cards drop nested `authors`
- OLD `ARTICLE_CARD_SELECT` includes `authors:{order, profile:{id,username,displayName,image}}` on every card (get-articles.ts:25-38; used by list AND related).
- NEW `_card` has no `authors` key (services/articles.py:85-98); list/related return cards without authors.
- Impact: archive/related cards cannot show author info that OLD exposed.
- Fix: include an `authors` array (card shape) in `_card`, or a dedicated card builder; prefetch to avoid N+1.

#### ⚠️ 8. Slug collision strategy differs
- OLD: when no slug provided, `createSlug(title)-{Date.now().toString(36)}` — always unique via timestamp suffix; if explicit slug given, used as-is (no collision handling, relies on unique constraint → error) (manage-articles.ts:45).
- NEW: `create_slug(title)` then `find_next_slug_variant` (`-2/-3/...`) against all existing slugs (services/articles.py:153-155). Also applies variant logic to a **provided** slug, where OLD used a provided slug verbatim.
- Impact: different generated slug values (SEO/URLs); provided-slug behavior diverges (OLD errors on dup, NEW silently appends `-2`). Update path: OLD provided-slug used verbatim; NEW rejects dup with 409 (services:186-188) — different error contract.
- Fix: decide canonical strategy; if matching OLD, append timestamp base-36 suffix when slug absent and use provided slug verbatim.

#### ⚠️ 9. Validation thresholds diverge
- OLD Zod: title ≤200 & (publish) ≥5; content (publish) ≥50; excerpt ≤500; status enum = draft/pending/published only; category required on publish (blog.ts:15-78).
- NEW DRF: title 3–512; content min 20 (create) / none (update); excerpt ≤4000; status enum = 6 values incl rejected/approved/inactive (serializers/article.py:6,9-27).
- Impact: NEW accepts longer titles/excerpts and shorter content than OLD allowed; NEW lets blog status be set to `rejected/approved/inactive` which OLD blog Zod forbade (blog.ts:31,86). Looser validation = data that OLD would reject.
- Fix: align min/max with OLD; restrict status choices for blog to draft/pending/published (or confirm product intent); add publish-time refinement (title≥5, content≥50, category required).

#### ⚠️ 10. Status enum surface
- OLD blog model reuses Prisma `Status` (7 values: draft, pending, published, rejected, approved, inactive — service.prisma:9-17; that is 6 distinct + note OLD list shows 6 under enum... 6 listed). OLD blog *validation* only permits 3 (draft/pending/published).
- NEW `BlogStatus` defines 6 (draft/pending/published/rejected/approved/inactive) and serializer allows all 6.
- Impact: minor — model enums align; the practical gap is the validation surface (#9). Flagged for completeness.

---

### Response-shape mismatches

1. Public list pagination object:
   - OLD `BlogArticlesResponse` = `{ articles, total, totalPages, hasMore }` (types/blog.ts:96-101; get-articles.ts:92-97).
   - NEW = `{ articles, total, page, totalPages }` (services/articles.py:52-57). **`hasMore` missing; `page` added.** Any FE "load more" relying on `hasMore` breaks (FE just passes `data` through untyped — get-articles.ts:16).

2. Card object keys/casing:
   - OLD card (Prisma payload, camelCase): `id, slug, title, excerpt, coverImage, categorySlug, featured, publishedAt, createdAt, authors[]` — no `status`, no `updatedAt`.
   - NEW `_card`: adds `status`, `updatedAt`; **omits `authors`** (services/articles.py:85-98). Extra keys are tolerable; missing `authors` is a real loss (#7).

3. Dates:
   - OLD returns native `Date` objects (serialized by Next as ISO over the wire). NEW returns `.isoformat()` strings (services/articles.py:95-97). Casing/format OK (ISO 8601), but OLD `publishedAt` for an unpublished article is `null`; NEW same. ✅

4. Detail author object:
   - OLD: `{ order, profile:{ id, username, displayName, image, authorBio, subcategory, rating, reviewCount } }` (get-article.ts:21-39).
   - NEW: flat `{ id, username, displayName, image, authorBio }` — **no `order` wrapper, no `profile` nesting, missing subcategory/rating/reviewCount** (services/articles.py:106-112). Structural mismatch — FE AuthorBox expecting `author.profile.*` + `author.order` will not match.

5. Create/update return:
   - OLD `{ success, data:{ id, slug } }`; NEW endpoint returns `{ id, slug }` (FE wraps into `{success,data}`). ✅ equivalent after FE wrap (manage-articles.ts:28-35).

6. Related endpoint empty case:
   - OLD: returns `{success:true, data:[]}` on no category. NEW: when article missing returns `[]` (view:32). ✅

---

### Counts

- matched (✅): 16
- partial (⚠️): 13
- missing (❌): 2
- needs_verification (❓): 0
