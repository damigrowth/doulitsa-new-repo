'use client';

import { useMemo } from 'react';
import ProfilesHome from './home-profiles';
import type { ArchiveProfileCardData } from '@/lib/types/components';

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

interface ProfilesHomeWrapperProps {
  profiles: ArchiveProfileCardData[];
}

export function ProfilesHomeWrapper({ profiles }: ProfilesHomeWrapperProps) {
  // Shuffle profiles client-side so each visit gets a fresh order
  const shuffledProfiles = useMemo(() => shuffleArray(profiles), [profiles]);

  return <ProfilesHome profiles={shuffledProfiles} />;
}
