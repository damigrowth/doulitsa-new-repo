'use client';

import dynamic from 'next/dynamic';

const BottomToTop = dynamic(
  () =>
    import('../shared/button-scroll-to-top').then((mod) => ({
      default: mod.default,
    })),
  {
    ssr: false,
    loading: () => null, // No loading state needed for scroll to top
  },
);

export default function BottomToTop_D() {
  return <BottomToTop />;
}
