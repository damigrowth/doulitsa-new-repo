import React from 'react';
import ServiceCard from '@/components/shared/service-card';
import { ServiceCardData } from '@/lib/types';

interface ServiceAdditionalProps {
  services: ServiceCardData[];
}

/**
 * "Additional Services" section displayed on service pages
 * for promoted subscribers. Shows other services from the
 * same professional profile.
 *
 * Mirrors ServiceRelated component structure.
 */
export default function ServiceAdditional({
  services,
}: ServiceAdditionalProps) {
  if (!services || services.length === 0) {
    return null;
  }

  return (
    <section className='py-16 bg-white'>
      <div className='container mx-auto px-6'>
        <div className='mb-12'>
          <h2 className='text-2xl font-bold text-dark leading-8 mb-2'>
            Επιπλέον υπηρεσίες
          </h2>
          <p className='text-sm font-normal text-dark leading-7'>
            Προσφέρονται από το ίδιο επαγγελματικό προφίλ
          </p>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6'>
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </div>
    </section>
  );
}
