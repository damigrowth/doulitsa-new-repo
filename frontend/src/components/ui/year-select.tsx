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
import * as React from 'react';

interface YearSelectProps {
  value?: string;
  onValueChange?: (year: string) => void;
  placeholder?: string;
  className?: string;
  startYear?: number;
  endYear?: number;
  clearable?: boolean;
}

export default function YearSelect({
  value,
  onValueChange,
  placeholder = 'Επιλέξτε έτος...',
  className,
  startYear = 1950,
  endYear = new Date().getFullYear(),
  clearable = false,
}: YearSelectProps) {
  const years = React.useMemo(() => {
    const yearList = [];
    for (let year = endYear; year >= startYear; year--) {
      yearList.push(year);
    }
    return yearList;
  }, [startYear, endYear]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onValueChange?.('');
  };

  return (
    <div className='relative w-full'>
      <Select value={value || ''} onValueChange={onValueChange}>
        <SelectTrigger
          className={cn(
            'w-full',
            !value && 'text-muted-foreground',
            clearable && value && 'pr-10',
            className,
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {clearable && value && (
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
