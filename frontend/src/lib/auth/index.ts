/**
 * Auth library — re-exports.
 *
 * `auth` (the Better Auth server instance) is intentionally NOT re-exported
 * here. Server actions migrated to the Django backend should import from
 * `@/lib/api/auth` directly.
 */

export { authClient } from './client';
