// Simple in-memory lock for preventing concurrent taxonomy updates
// For production with multiple instances, consider Redis-based locking

type LockState = {
  isLocked: boolean;
  lockedAt: Date | null;
  lockId: string | null;
};

const locks: Map<string, LockState> = new Map();
const LOCK_TIMEOUT = 30000; // 30 seconds

/**
 * Acquire a lock for a given resource
 * Throws error if lock cannot be acquired
 */
export async function acquireLock(
  resourceId: string,
  timeout: number = LOCK_TIMEOUT
): Promise<string> {
  const lockState = locks.get(resourceId);
  const now = new Date();

  // Check if lock exists and is still valid
  if (lockState?.isLocked && lockState.lockedAt) {
    const elapsed = now.getTime() - lockState.lockedAt.getTime();

    // If lock is expired, release it
    if (elapsed > timeout) {
      console.warn(`[LOCK] Lock expired for ${resourceId}, releasing...`);
      await releaseLock(resourceId);
    } else {
      throw new Error(
        `Resource ${resourceId} is currently locked. Please try again in a few seconds.`
      );
    }
  }

  // Create new lock
  const lockId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  locks.set(resourceId, {
    isLocked: true,
    lockedAt: now,
    lockId,
  });

  console.log(`[LOCK] Acquired lock for ${resourceId} (${lockId})`);

  return lockId;
}

/**
 * Release a lock for a given resource
 */
export async function releaseLock(resourceId: string): Promise<void> {
  const lockState = locks.get(resourceId);

  if (lockState?.isLocked) {
    locks.set(resourceId, {
      isLocked: false,
      lockedAt: null,
      lockId: null,
    });
    console.log(`[LOCK] Released lock for ${resourceId}`);
  }
}

/**
 * Check if a resource is currently locked
 */
export function isLocked(resourceId: string): boolean {
  const lockState = locks.get(resourceId);

  if (!lockState?.isLocked || !lockState.lockedAt) {
    return false;
  }

  const elapsed = Date.now() - lockState.lockedAt.getTime();
  return elapsed <= LOCK_TIMEOUT;
}

/**
 * Execute a function with automatic lock management
 */
export async function withLock<T>(
  resourceId: string,
  fn: () => Promise<T>
): Promise<T> {
  const lockId = await acquireLock(resourceId);

  try {
    return await fn();
  } finally {
    await releaseLock(resourceId);
  }
}
