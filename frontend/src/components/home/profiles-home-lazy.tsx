'use client';

import dynamic from 'next/dynamic';
import { ProfilesHomeSkeleton } from './profiles-home-skeleton';
import type { ArchiveProfileCardData } from '@/lib/types/components';

// Lazy load the profiles section wrapper
const ProfilesHomeWrapper = dynamic(
  () => import('./profiles-home-wrapper').then((mod) => ({ default: mod.ProfilesHomeWrapper })),
  {
    loading: () => <ProfilesHomeSkeleton />,
    ssr: false, // Below-fold content doesn't need SSR
  }
);

interface ProfilesHomeLazyProps {
  profiles: ArchiveProfileCardData[];
}

export function ProfilesHomeLazy({ profiles }: ProfilesHomeLazyProps) {
  return <ProfilesHomeWrapper profiles={profiles} />;
}
