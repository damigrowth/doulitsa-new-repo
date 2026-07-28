'use client';

import React, { useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import useServiceOrderStore from '@/lib/stores/use-service-order-store';

interface ServiceAddonsProps {
  addons: AppJson.ServiceAddon[];
  price?: number;
  compact?: boolean;
}

export default function ServiceAddons({
  addons,
  price,
  compact = false,
}: ServiceAddonsProps) {
  const { order, setOrder, calculateTotal } = useServiceOrderStore();

  const handleSelectAddons = (addon: AppJson.ServiceAddon) => {
    const isExist = order.addons.some((a) => a.title === addon.title);

    if (!isExist) {
      setOrder({ addons: [...order.addons, addon] });
    } else {
      const newAddons = order.addons.filter(
        (item) => item.title !== addon.title,
      );
      setOrder({ addons: newAddons });
    }
  };

  useEffect(() => {
    calculateTotal();
  }, [order.addons, calculateTotal]);

  if (addons.length === 0) return null;

  if (compact) {
    return (
      <div className='space-y-2 mb-5'>
        {addons.map((addon, index) => {
          const isSelected = order.addons.some((a) => a.title === addon.title);
          return (
            <div
              key={index}
              className={`border rounded-xl py-4 px-3 transition-colors ${
                isSelected
                  ? 'border-third bg-fifth'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <label className='flex cursor-pointer'>
                {/* Checkbox on left */}
                <div className='mr-3 mt-0.5'>
                  <Checkbox
                    checked={order.addons.some((a) => a.title === addon.title)}
                    onCheckedChange={() => handleSelectAddons(addon)}
                    className='data-[state=checked]:bg-secondary data-[state=checked]:border-secondary'
                  />
                </div>

                {/* Content stacked to the right of checkbox */}
                <div className='flex-1 space-y-2 '>
                  <h5 className='text-sm font-medium text-gray-900 mb-1'>
                    {addon.title}
                  </h5>
                  <p className='text-sm text-muted-foreground mb-2'>
                    {addon.description}
                  </p>

                  {/* Price at bottom right */}
                  <div className='flex justify-end'>
                    <span className='text-base font-bold text-gray-700'>
                      +{addon.price}€
                    </span>
                  </div>
                </div>
              </label>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className='mb-10'>
      {/* {price && price > 0 && (
        <div className='text-2xl font-bold text-primary mb-2'>{price}€</div>
      )}
      <h2 className='text-lg font-semibold mb-4'>Extra Υπηρεσίες</h2> */}
      <div className='space-y-4'>
        {addons.map((addon, index) => {
          const isSelected = order.addons.some((a) => a.title === addon.title);
          return (
            <div
              key={index}
              className={`border-2 rounded-xl px-6 py-7 transition-colors ${
                isSelected
                  ? 'border-third bg-fifth'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <label className='flex items-center cursor-pointer'>
                {/* Checkbox centered vertically on left */}
                <div className='flex items-center mr-4'>
                  <Checkbox
                    checked={order.addons.some((a) => a.title === addon.title)}
                    onCheckedChange={() => handleSelectAddons(addon)}
                    className='data-[state=checked]:bg-secondary data-[state=checked]:border-secondary'
                  />
                </div>

                {/* Content - Title and Description stacked */}
                <div className='flex-1 mr-4 space-y-2'>
                  <h5 className='font-semibold text-gray-900 mb-1'>
                    {addon.title}
                  </h5>
                  <p className='text-sm text-muted-foreground'>
                    {addon.description}
                  </p>
                </div>

                {/* Price centered vertically on right */}
                <div className='flex items-center'>
                  <span className='text-xl font-bold text-gray-900'>
                    +{addon.price}€
                  </span>
                </div>
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
