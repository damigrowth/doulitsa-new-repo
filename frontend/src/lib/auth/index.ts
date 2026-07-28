/**
 * Auth library — re-exports.
 *
 * `auth` (the Better Auth server instance) is intentionally NOT re-exported
 * here. Server actions migrated to the Django backend should import from
 * `@/lib/api/auth` directly. The legacy `lib/auth/config.ts` is kept on disk
 * for reference / cutover but is no longer imported by anything.
 */

export { authClient } from './client';
