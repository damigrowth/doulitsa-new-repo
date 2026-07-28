'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export interface SelectOption {
  id: string;
  label: string;
  [key: string]: any;
}

interface SelectboxProps {
  options: SelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
  clearable?: boolean;
}

export function Selectbox({
  options,
  value,
  onValueChange,
  placeholder = 'Select an option',
  disabled = false,
  className,
  fullWidth = false,
  clearable = false,
}: SelectboxProps) {
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onValueChange('');
  };

  return (
    <div className={cn('relative', fullWidth && 'w-full')}>
      <Select
        value={value || ''}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger
          className={cn(
            fullWidth && 'w-full',
            clearable && value && 'pr-10',
            className,
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {clearable && value && !disabled && (
        <button
          type='button'
          onClick={handleClear}
          className='absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-50 hover:opacity-100 transition-opacity z-10'
        >
          <X className='h-4 w-4' />
        </button>
      )}
    </div>
  );
}
