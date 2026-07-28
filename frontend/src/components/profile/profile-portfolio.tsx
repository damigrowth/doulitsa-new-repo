import React from 'react';
import MediaGallery from '@/components/shared/media-gallery';

type ProfilePortfolioProps = {
  portfolio?: AppJson.Portfolio | null;
};

export default function ProfilePortfolio({ portfolio }: ProfilePortfolioProps) {
  // Don't render the section if there's no portfolio
  if (!portfolio || !Array.isArray(portfolio) || portfolio.length === 0) {
    return null;
  }

  return (
    <section className='py-5'>
      <h4 className='font-semibold text-lg text-foreground mb-5'>
        Δείγμα Εργασιών
      </h4>
      <MediaGallery media={portfolio} showCards={false} />
    </section>
  );
}
