/**
 * Centralized Prisma SELECT constants
 *
 * Re-exports all SELECT statements used across the application for optimized queries.
 * These constants reduce data transfer by 60-70% by fetching only required fields.
 *
 * Usage:
 * ```typescript
 * import { SERVICE_ARCHIVE_SELECT, PROFILE_ARCHIVE_SELECT } from '@/lib/database/selects';
 *
 * const services = await prisma.service.findMany({
 *   select: SERVICE_ARCHIVE_SELECT,
 * });
 * ```
 *
 * @see OPTIMIZATION-SUMMARY.md for performance metrics and rationale
 */

export {
  SERVICE_ARCHIVE_SELECT,
  SERVICE_DETAIL_SELECT,
  HOME_SERVICE_SELECT,
} from './service';

export {
  PROFILE_ARCHIVE_SELECT,
  HOME_PROFILE_SELECT,
  PROFILE_DETAIL_INCLUDE,
} from './profile';

export {
  SAVED_SERVICE_INCLUDE,
  SAVED_PROFILE_INCLUDE,
} from './saved';

export {
  CHAT_LIST_SELECT,
  MESSAGE_WITH_AUTHOR_INCLUDE,
} from './chat';
