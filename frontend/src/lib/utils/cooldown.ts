/**
 * Cooldown/Rate Limiting Utilities
 *
 * Shared utilities for calculating cooldown periods and rate limits.
 * Used by username change and potentially other features with time-based restrictions.
 */

export const USERNAME_COOLDOWN_DAYS = 30;

/**
 * Check if an action is allowed based on the last change date and cooldown period.
 * Used server-side in actions.
 *
 * @param lastChange - The date of the last action (null if never done)
 * @param cooldownDays - Number of days required between actions
 * @returns Object with `allowed` boolean and optional `daysRemaining`
 */
export function checkCooldown(
  lastChange: Date | null,
  cooldownDays: number = USERNAME_COOLDOWN_DAYS,
): { allowed: boolean; daysRemaining?: number } {
  if (!lastChange) return { allowed: true };

  const daysSinceChange = Math.floor(
    (Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysSinceChange >= cooldownDays) {
    return { allowed: true };
  }

  return {
    allowed: false,
    daysRemaining: cooldownDays - daysSinceChange,
  };
}

/**
 * Calculate days remaining until next allowed action.
 * Used client-side in form components.
 *
 * @param lastChange - The date of the last action (can be Date or ISO string)
 * @param cooldownDays - Number of days required between actions
 * @returns Number of days remaining, or null if action is allowed now
 */
export function getDaysRemaining(
  lastChange: Date | string | null,
  cooldownDays: number = USERNAME_COOLDOWN_DAYS,
): number | null {
  if (!lastChange) return null;

  const lastChangeDate =
    typeof lastChange === 'string' ? new Date(lastChange) : lastChange;

  const daysSinceChange = Math.floor(
    (Date.now() - lastChangeDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysSinceChange >= cooldownDays) {
    return null; // Can change now
  }

  return cooldownDays - daysSinceChange;
}

/**
 * Calculate the next allowed change date.
 *
 * @param cooldownDays - Number of days until next allowed change
 * @returns ISO string of the next allowed date
 */
export function getNextChangeDate(
  cooldownDays: number = USERNAME_COOLDOWN_DAYS,
): string {
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + cooldownDays);
  return nextDate.toISOString();
}
