'use client';

import React from 'react';
import { LazyCombobox, type LazyComboboxOption } from '@/components/ui/lazy-combobox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ProfileSelectorProps {
  options: LazyComboboxOption[];
  value?: string;
  onValueChange: (value: string, profile: LazyComboboxOption | null) => void;
  disabled?: boolean;
}

export function ProfileSelector({
  options,
  value,
  onValueChange,
  disabled,
}: ProfileSelectorProps) {
  const handleSelect = (selected: LazyComboboxOption | LazyComboboxOption[]) => {
    // LazyCombobox returns single option or array depending on multiple prop
    const selectedOption = Array.isArray(selected) ? selected[0] : selected;
    onValueChange(selectedOption.value, selectedOption);
  };

  const formatLabel = (option: LazyComboboxOption) => {
    const metadata = option.metadata as {
      email?: string;
      role?: string;
      image?: string | null;
      username?: string;
    } | undefined;

    return (
      <div className='flex items-center gap-3 w-full'>
        <Avatar className='h-8 w-8'>
          <AvatarImage src={metadata?.image || ''} />
          <AvatarFallback>
            {(option.label || 'U')[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className='flex flex-col flex-1 min-w-0'>
          <span className='font-medium truncate'>{option.label}</span>
          {metadata?.email && (
            <span className='text-xs text-muted-foreground truncate'>
              {metadata.email}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <LazyCombobox
      trigger='search'
      clearable={true}
      options={options}
      value={value || ''}
      onSelect={handleSelect}
      placeholder='Πληκτρολογήστε για αναζήτηση προφίλ...'
      searchPlaceholder='Αναζήτηση προφίλ...'
      emptyMessage='Δεν βρέθηκαν προφίλ.'
      formatLabel={formatLabel}
      disabled={disabled}
    />
  );
}
