import React from 'react';
import ServiceCard from '@/components/shared/service-card';
import { ServiceCardData } from '@/lib/types';

interface ServiceRelatedProps {
  services: ServiceCardData[];
  categoryLabel?: string;
}

export default function ServiceRelated({
  services,
  categoryLabel,
}: ServiceRelatedProps) {
  // Don't render if no related services
  if (!services || services.length === 0) {
    return null;
  }

  return (
    <section className='py-16 bg-silver'>
      <div className='container mx-auto px-6'>
        {/* Header Section */}
        <div className='mb-12'>
          <h2 className='text-2xl font-bold text-dark leading-8 mb-2'>
            Δείτε Ακόμα
          </h2>
          <p className='text-sm font-normal text-dark leading-7'>
            Περισσότερες σχετικές υπηρεσίες...
          </p>
        </div>

        {/* Services Grid - 5 in a row on desktop, scrollable on mobile */}
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6'>
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </div>
    </section>
  );
}
