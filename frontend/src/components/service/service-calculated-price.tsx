'use client';

import React from 'react';
import useServiceOrderStore from '@/lib/stores/use-service-order-store';

interface ServiceCalculatedPriceProps {
  basePrice: number;
  compact?: boolean;
}

export default function ServiceCalculatedPrice({
  basePrice,
  compact = false,
}: ServiceCalculatedPriceProps) {
  const { order } = useServiceOrderStore();

  // Convert basePrice to number for reliable comparison
  const basePriceValue = Number(basePrice) || 0;

  // Calculate total addon price
  const addonPrice = order.addons.reduce((acc, addon) => acc + addon.price, 0);
  const totalPrice = basePriceValue + addonPrice;

  if (totalPrice <= 0) return null;

  return (
    <div className={`text-2xl font-bold mb-4 ${
      compact ? 'text-primary-dark' : 'text-gray-900'
    }`}>
      {totalPrice}€
    </div>
  );
}