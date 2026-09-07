# Claude instructions for this repo

## Git rules — IMPORTANT

- **NEVER push to any git remote.** Not `git push`, not branch pushes, not
  tag pushes, not `--delete` on remote branches. The user handles all pushes
  themselves, always.
- Do not commit unless the user explicitly asks for a commit in that moment.
  Leave changes in the working tree and tell the user what is ready.
- Never add, remove, or change git remotes without being explicitly asked.
- Context: this project once shared a GitHub repo with the old production app
  (`damigrowth/nextjs`, wired to Vercel production). A wrong push there created
  real risk. The new stack lives in `damigrowth/doulitsa-new-repo` — but even
  there, pushing is the user's job.

## Project context

- New stack: `frontend/` (Next.js 15, App Router) + `backend/` (Django + DRF +
  Postgres + Celery + Channels). Deployed to Dokploy (test.doulitsa.gr).
- Old production (`doulitsa.gr`) still runs the legacy Next.js app from the
  `damigrowth/nextjs` repo via Vercel until cutover. Never touch that repo.
- Parity rule: the old app's behavior is the source of truth. When porting or
  fixing, read the old algorithm (fetchable from the old repo on GitHub) and
  match it exactly — differences are bugs, not improvements.
- Taxonomies: Django DB is the single source of truth (admin edits go live
  within ~60s). The static datasets / `maps.generated.json` are a build-time
  fallback only, refreshed from Django by `yarn build:taxonomies`.
- Caching: public reads use the Data Cache with tags + 5-min TTL; writes
  invalidate via helpers in `frontend/src/lib/cache/revalidation.ts`. Cached
  API calls must stay anonymous (no cookies/headers) — see
  `frontend/src/lib/api/client.ts` `revalidate`/`tags` options.
