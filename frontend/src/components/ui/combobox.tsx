'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface ComboboxOption {
  id: string;
  label: string;
  [key: string]: any; // Allow additional properties
}

export interface ComboboxGroup {
  heading?: string;
  options: ComboboxOption[];
}

export interface ComboboxProps {
  // Data
  options?: ComboboxOption[];
  groups?: ComboboxGroup[];
  value?: string;
  onSelect: (option: ComboboxOption) => void;

  // Display
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  formatLabel?: (option: ComboboxOption) => React.ReactNode;
  getButtonLabel?: (option: ComboboxOption | undefined) => string;

  // Styling
  className?: string;
  disabled?: boolean;
}

export function Combobox({
  options = [],
  groups,
  value,
  onSelect,
  placeholder = 'Επιλογή...',
  searchPlaceholder = 'Αναζήτηση...',
  emptyMessage = 'Δεν βρέθηκαν αποτελέσματα.',
  formatLabel,
  getButtonLabel,
  className,
  disabled = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const allOptions = React.useMemo(
    () => (groups ? groups.flatMap((g) => g.options) : options),
    [groups, options]
  );

  // Get selected option
  const selectedOption = React.useMemo(
    () => allOptions.find((option) => option.id === value),
    [allOptions, value]
  );

  // Button label
  const buttonLabel = React.useMemo(() => {
    if (getButtonLabel) {
      return getButtonLabel(selectedOption);
    }
    return selectedOption?.label || placeholder;
  }, [selectedOption, getButtonLabel, placeholder]);

  // Option label formatter
  const renderLabel = React.useCallback(
    (option: ComboboxOption) => {
      if (formatLabel) {
        return formatLabel(option);
      }
      return option.label;
    },
    [formatLabel]
  );

  const renderOption = (option: ComboboxOption) => (
    <CommandItem
      key={option.id}
      value={option.label}
      onSelect={() => {
        onSelect(option);
        setOpen(false);
      }}
    >
      <Check
        className={cn(
          'mr-2 h-4 w-4',
          value === option.id ? 'opacity-100' : 'opacity-0'
        )}
      />
      {renderLabel(option)}
    </CommandItem>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className={cn(
            'w-full justify-between',
            'font-normal',
            !value && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <span className='truncate'>{buttonLabel}</span>
          <ChevronsUpDown className='h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-full p-0' align='start'>
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {groups ? (
              groups.map((group, i) => (
                <CommandGroup key={i} heading={group.heading}>
                  {group.options.map(renderOption)}
                </CommandGroup>
              ))
            ) : (
              <CommandGroup>
                {options.map(renderOption)}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
