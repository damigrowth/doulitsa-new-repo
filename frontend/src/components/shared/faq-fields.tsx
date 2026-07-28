'use client';

import React from 'react';
import { Control, useFieldArray } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, HelpCircle } from 'lucide-react';
import type { ServiceFaqInput } from '@/lib/validations/service';

interface FaqFieldsProps {
  control: Control<any>;
  name: string;
  maxFaq?: number;
}

export function FaqFields({ control, name, maxFaq = 5 }: FaqFieldsProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });

  const addNewFaq = () => {
    const newFaq: ServiceFaqInput = {
      question: '',
      answer: '',
    };
    append(newFaq);
  };

  if (fields.length === 0) {
    return (
      <div className='text-center py-12 border-2 border-dashed border-gray-200 rounded-lg'>
        <HelpCircle className='w-12 h-12 text-gray-400 mx-auto mb-4' />
        <h4 className='text-lg font-medium text-gray-900 mb-2'>
          Δεν έχετε προσθέσει συχνές ερωτήσεις
        </h4>
        <p className='text-gray-600 mb-6'>
          Προσθέστε συχνές ερωτήσεις για να βοηθήσετε τους πελάτες σας
        </p>
        <Button
          type='button'
          onClick={addNewFaq}
          className='flex items-center space-x-2 place-self-center'
        >
          <Plus className='w-4 h-4' />
          <span>Προσθήκη ερώτησης</span>
        </Button>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {fields.map((field, index) => (
        <Card key={field.id} className='relative'>
          <CardHeader className='pb-3'>
            <div className='flex items-center justify-between'>
              <CardTitle className='text-base'>Ερώτηση #{index + 1}</CardTitle>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={() => remove(index)}
                className='text-red-600 hover:text-red-700 hover:bg-red-50'
              >
                <Trash2 className='w-4 h-4' />
              </Button>
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            <FormField
              control={control}
              name={`${name}.${index}.question`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ερώτηση*</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='π.χ. Πόσο χρόνο χρειάζεται για την ολοκλήρωση;'
                      maxLength={200}
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 200);
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <div className='text-xs text-gray-500'>
                    {(field.value || '')?.length || 0}/200 χαρακτήρες
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`${name}.${index}.answer`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Απάντηση*</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Δώστε μια αναλυτική απάντηση...'
                      rows={4}
                      maxLength={1000}
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 1000);
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <div className='text-xs text-gray-500'>
                    {(field.value || '')?.length || 0}/1000 χαρακτήρες
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      ))}

      {fields.length < maxFaq && (
        <Button
          type='button'
          variant='outline'
          onClick={addNewFaq}
          className='w-full flex items-center space-x-2'
        >
          <Plus className='w-4 h-4' />
          <span>Προσθήκη νέας ερώτησης</span>
        </Button>
      )}

      {fields.length >= maxFaq && (
        <p className='text-sm text-gray-500 text-center'>
          Μπορείτε να προσθέσετε έως {maxFaq} συχνές ερωτήσεις
        </p>
      )}
    </div>
  );
}
