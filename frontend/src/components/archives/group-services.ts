import type { ArchiveServiceCardData } from '@/lib/types/components';
import type { ServiceCardData } from '@/lib/types';

type AnyServiceCard = ArchiveServiceCardData | ServiceCardData;

export interface GroupedArchiveService<T extends AnyServiceCard = AnyServiceCard> {
  service: T;
  /** Other services of the same profile within this results page. */
  more: T[];
  /**
   * Matching services of the profile that fall on OTHER pages of the filtered
   * result set (from the backend's profileMatchCount window annotation);
   * rendered as a «+N ακόμα» pill linking to the profile.
   */
  remainingCount: number;
}

/**
 * Group a results page's services by professional so each profile renders
 * ONE card (anchored at its first occurrence, keeping the sort order) with
 * the rest of their services shown as pills inside it (user decision
 * 2026-11-06 — deviates from OLD, which repeated the pro per service).
 * Grouping is per page: pagination/counts stay service-based.
 */
export function groupServicesByProfile<T extends AnyServiceCard>(
  services: T[],
): GroupedArchiveService<T>[] {
  const groups: GroupedArchiveService<T>[] = [];
  const byProfile = new Map<string, GroupedArchiveService<T>>();
  for (const s of services) {
    const profile = s.profile as { uid?: string; username?: string } | undefined;
    const key = String(profile?.uid ?? profile?.username ?? s.id);
    const existing = byProfile.get(key);
    if (existing) {
      existing.more.push(s);
    } else {
      const group: GroupedArchiveService<T> = { service: s, more: [], remainingCount: 0 };
      byProfile.set(key, group);
      groups.push(group);
    }
  }
  for (const g of groups) {
    const matchCount = Number(
      (g.service as { profileMatchCount?: number | null }).profileMatchCount,
    );
    if (Number.isFinite(matchCount) && matchCount > 0) {
      g.remainingCount = Math.max(0, matchCount - 1 - g.more.length);
    }
  }
  return groups;
}
