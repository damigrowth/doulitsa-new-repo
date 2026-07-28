'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import ServiceAddons from './service-addons';
// import ServiceCalculatedPrice from './service-calculated-price';
import ServiceBuy from './service-buy';

interface ServiceOrderFixedProps {
  price: number;
  addons: AppJson.ServiceAddon[];
  compact?: boolean;
  isOwner: boolean;
  profileUserId: string;
  profileDisplayName: string;
  serviceTitle: string;
}

export default function ServiceOrderFixed({
  price,
  addons,
  compact = false,
  isOwner,
  profileUserId,
  profileDisplayName,
  serviceTitle,
}: ServiceOrderFixedProps) {
  // Owner with no addons = nothing to show
  if (isOwner && addons.length === 0) return null;

  return (
    <Card className='mb-6 rounded-2xl border-gray-100 shadow-sm'>
      <CardContent className='p-6 flex flex-col'>
        {/* Price Display */}
        {/* <ServiceCalculatedPrice basePrice={price} compact={compact} /> */}

        {/* Addons */}
        {addons.length > 0 && (
          <ServiceAddons addons={addons} compact={compact} />
        )}

        {/* Buy Button */}
        <ServiceBuy
          price={price}
          isOwner={isOwner}
          profileUserId={profileUserId}
          profileDisplayName={profileDisplayName}
          serviceTitle={serviceTitle}
          compact={compact}
        />
      </CardContent>
    </Card>
  );
}
