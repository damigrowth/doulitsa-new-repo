'use client';

import React, { useState, useEffect } from 'react';

// Custom components
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Icons
import { HelpCircle, Package } from 'lucide-react';

// Form context
import { useFormContext, useWatch } from 'react-hook-form';

// Types
import type { CreateServiceInput } from '@/lib/validations/service';
import { AddonFields } from '@/components/shared/addon-fields';
import { FaqFields } from '@/components/shared/faq-fields';

export default function AddonsFaqStep() {
  const form = useFormContext<CreateServiceInput>();
  const {
    formState: { errors },
  } = form;

  // Local state
  const [activeTab, setActiveTab] = useState('addons');

  // Use useWatch for reactive updates
  const addons = useWatch({
    control: form.control,
    name: 'addons',
    defaultValue: [],
  });

  const faq = useWatch({
    control: form.control,
    name: 'faq',
    defaultValue: [],
  });

  // Get array-level errors
  const addonsError = errors.addons?.message;
  const faqError = errors.faq?.message;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
      <TabsList className='grid w-full grid-cols-2 p-1.5 h-auto'>
        <TabsTrigger
          value='addons'
          className='flex items-center space-x-2 py-1.5'
        >
          <Package className='w-4 h-4' />
          <span>Extra υπηρεσίες</span>
          {addons.length > 0 && (
            <span className='ml-1 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full'>
              {addons.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value='faq' className='flex items-center space-x-2 py-1.5'>
          <HelpCircle className='w-4 h-4' />
          <span>Συχνές ερωτήσεις</span>
          {faq.length > 0 && (
            <span className='ml-1 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full'>
              {faq.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value='addons' className='space-y-6'>
        <AddonFields control={form.control} name='addons' maxAddons={3} />
        {addonsError && (
          <Alert variant='destructive'>
            <AlertDescription>{addonsError}</AlertDescription>
          </Alert>
        )}
      </TabsContent>

      <TabsContent value='faq' className='space-y-6'>
        <FaqFields control={form.control} name='faq' maxFaq={5} />
        {faqError && (
          <Alert variant='destructive'>
            <AlertDescription>{faqError}</AlertDescription>
          </Alert>
        )}
      </TabsContent>
    </Tabs>
  );
}
