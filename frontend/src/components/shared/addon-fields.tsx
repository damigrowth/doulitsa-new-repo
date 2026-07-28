'use client';

import React from 'react';
import { Control, useFieldArray, useFormContext } from 'react-hook-form';
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
import { Currency } from '@/components/ui/currency';
import { Plus, Trash2, Package } from 'lucide-react';
import type { ServiceAddonInput } from '@/lib/validations/service';

interface AddonFieldsProps {
  control: Control<any>;
  name: string;
  maxAddons?: number;
}

export function AddonFields({
  control,
  name,
  maxAddons = 3,
}: AddonFieldsProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });

  // Get form context to access errors
  const {
    formState: { errors },
  } = useFormContext();

  const addNewAddon = () => {
    const newAddon: ServiceAddonInput = {
      title: '',
      description: '',
      price: 0,
    };
    append(newAddon);
  };

  if (fields.length === 0) {
    return (
      <div className='text-center py-12 border-2 border-dashed border-gray-200 rounded-lg'>
        <Package className='w-12 h-12 text-gray-400 mx-auto mb-4' />
        <h4 className='text-lg font-medium text-gray-900 mb-2'>
          Δεν έχετε προσθέσει extra υπηρεσίες
        </h4>
        <p className='text-gray-600 mb-6'>
          Προσθέστε extra υπηρεσίες για να αυξήσετε την αξία της προσφοράς σας
        </p>
        <Button
          type='button'
          onClick={addNewAddon}
          className='flex items-center space-x-2 place-self-center'
        >
          <Plus className='w-4 h-4' />
          <span>Προσθήκη extra υπηρεσίας</span>
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
              <CardTitle className='text-base'>
                Extra υπηρεσία #{index + 1}
              </CardTitle>
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
              name={`${name}.${index}.title`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Τίτλος*</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='π.χ. Επιπλέον αναθεώρηση'
                      maxLength={100}
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 100);
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <div className='text-xs text-gray-500'>
                    {field.value?.length || 0}/100 χαρακτήρες
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`${name}.${index}.description`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Περιγραφή*</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Περιγράψτε την extra υπηρεσία...'
                      rows={3}
                      maxLength={500}
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 500);
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <div className='text-xs text-gray-500'>
                    {field.value?.length || 0}/500 χαρακτήρες
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`${name}.${index}.price`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Τιμή*</FormLabel>
                  <FormControl>
                    <Currency
                      currency='€'
                      position='right'
                      placeholder='π.χ. 20'
                      min={5}
                      max={5000}
                      allowDecimals={false}
                      value={field.value || 0}
                      onValueChange={(value) => {
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      ))}

      {fields.length < maxAddons && (
        <Button
          type='button'
          variant='outline'
          onClick={addNewAddon}
          className='w-full flex items-center space-x-2'
        >
          <Plus className='w-4 h-4' />
          <span>Προσθήκη νέας extra υπηρεσίας</span>
        </Button>
      )}

      {fields.length >= maxAddons && (
        <p className='text-sm text-gray-500 text-center'>
          Μπορείτε να προσθέσετε έως {maxAddons} extra υπηρεσίες
        </p>
      )}
    </div>
  );
}
