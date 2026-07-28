'use client';

import { ArrowUpDown, Search, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import { LazyCombobox } from '@/components/ui/lazy-combobox';
import { Selectbox } from '@/components/ui/selectbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import type { DatasetItem } from '@/lib/types/datasets';
import { archiveSortOptions } from '@/constants/datasets/options';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value: string | undefined;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onValueChange,
  placeholder = 'Αναζήτηση...',
  className,
}: SearchInputProps) {
  const handleClear = () => {
    onValueChange('');
  };

  return (
    <div className={`relative ${className || ''}`}>
      <Search
        className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-500'
        size={16}
      />
      <Input
        type='text'
        value={value || ''}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className='pl-9 pr-9'
      />
      {value && (
        <button
          type='button'
          onClick={handleClear}
          className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

interface OnlineToggleProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export function OnlineToggle({
  id,
  checked,
  onCheckedChange,
  label = 'Online',
  className,
}: OnlineToggleProps) {
  return (
    <div
      role='button'
      tabIndex={0}
      onClick={() => onCheckedChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCheckedChange(!checked);
        }
      }}
      className={cn(
        'inline-flex items-center gap-2 rounded-md border-2 border-input bg-background shadow px-4 h-9 flex-shrink-0 whitespace-nowrap cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors',
        className,
      )}
    >
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        tabIndex={-1}
        className='pointer-events-none'
      />
      <Label htmlFor={id} className='text-sm font-medium cursor-pointer pointer-events-none'>
        {label}
      </Label>
    </div>
  );
}

interface CountiesDropdownProps {
  value: string | undefined;
  onValueChange: (value: string) => void;
  counties: DatasetItem[];
  placeholder?: string;
  allLabel?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  fullWidth?: boolean;
}

export function CountiesDropdown({
  value,
  onValueChange,
  counties,
  placeholder = 'Όλες οι περιοχές',
  allLabel = 'Όλες οι περιοχές',
  searchPlaceholder = 'Αναζήτηση περιοχής...',
  emptyMessage = 'Δεν βρέθηκαν περιοχές.',
  className,
  fullWidth = true,
}: CountiesDropdownProps) {
  const groups = [
    {
      options: [{ id: 'all', label: allLabel, name: allLabel }],
    },
    {
      heading: 'Νομοί',
      options: counties.map((county) => ({
        id: county.slug || county.name,
        label: county.name,
        name: county.name,
      })),
    },
  ];

  return (
    <Combobox
      groups={groups}
      value={value || 'all'}
      onSelect={(option) =>
        onValueChange(option.id === 'all' ? '' : option.id)
      }
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      className={cn(fullWidth && 'w-full min-w-48', className)}
    />
  );
}

interface SortDropdownProps {
  value: string | undefined;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  fullWidth?: boolean;
  iconOnly?: boolean;
}

export function SortDropdown({
  value,
  onValueChange,
  placeholder = 'Ταξινόμηση',
  className,
  fullWidth = true,
  iconOnly = false,
}: SortDropdownProps) {
  if (iconOnly) {
    return (
      <Select value={value || 'default'} onValueChange={onValueChange}>
        <SelectTrigger className={cn('w-10 px-0 justify-center [&>svg:last-child]:hidden', className)}>
          <ArrowUpDown className='h-4 w-4' />
        </SelectTrigger>
        <SelectContent>
          {archiveSortOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Selectbox
      options={archiveSortOptions}
      value={value || 'default'}
      onValueChange={onValueChange}
      placeholder={placeholder}
      className={cn(fullWidth && 'min-w-48', className)}
      fullWidth={fullWidth}
    />
  );
}

interface CategoryDropdownProps {
  value: string | undefined;
  onValueChange: (value: string) => void;
  categories: DatasetItem[];
  placeholder?: string;
  allLabel?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  fullWidth?: boolean;
}

export function CategoryDropdown({
  value,
  onValueChange,
  categories,
  placeholder = 'Όλες οι κατηγορίες',
  allLabel = 'Όλες οι κατηγορίες',
  searchPlaceholder = 'Αναζήτηση κατηγορίας...',
  emptyMessage = 'Δεν βρέθηκαν κατηγορίες.',
  className,
  fullWidth = true,
}: CategoryDropdownProps) {
  // Add "all" option to the beginning and ensure label is always present
  const optionsWithAll = [
    { id: 'all', label: allLabel, plural: allLabel },
    ...categories.map((cat) => ({
      ...cat,
      label: cat.label || cat.name || cat.id,
    })),
  ];

  return (
    <Combobox
      options={optionsWithAll}
      value={value || 'all'}
      onSelect={(option) =>
        onValueChange(option.id === 'all' ? '' : option.id)
      }
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      formatLabel={(option) => option.plural || option.label}
      className={cn(fullWidth && 'w-full min-w-48', className)}
    />
  );
}

interface SubcategoryDropdownProps {
  value: string | undefined;
  onValueChange: (value: string) => void;
  subcategories: DatasetItem[];
  disabled?: boolean;
  placeholder?: string;
  allLabel?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  fullWidth?: boolean;
}

export function SubcategoryDropdown({
  value,
  onValueChange,
  subcategories,
  disabled = false,
  placeholder = 'Όλες οι υποκατηγορίες',
  allLabel = 'Όλες οι υποκατηγορίες',
  searchPlaceholder = 'Αναζήτηση υποκατηγορίας...',
  emptyMessage = 'Δεν βρέθηκαν υποκατηγορίες.',
  className,
  fullWidth = true,
}: SubcategoryDropdownProps) {
  // Add "all" option to the beginning and ensure label is always present
  const optionsWithAll = [
    { id: 'all', label: allLabel, plural: allLabel },
    ...subcategories.map((subcat) => ({
      ...subcat,
      label: subcat.label || subcat.name || subcat.id,
    })),
  ];

  return (
    <LazyCombobox
      options={optionsWithAll}
      value={value || 'all'}
      onSelect={(option) =>
        onValueChange(option.id === 'all' ? '' : option.id)
      }
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      formatLabel={(option) => option.plural || option.label}
      disabled={disabled}
      initialLimit={20}
      loadMoreIncrement={20}
      searchLimit={100}
      className={cn(fullWidth && 'w-full min-w-48', className)}
    />
  );
}

interface SubdivisionDropdownProps {
  value: string | undefined;
  onValueChange: (value: string) => void;
  subdivisions: DatasetItem[];
  disabled?: boolean;
  placeholder?: string;
  allLabel?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  fullWidth?: boolean;
}

export function SubdivisionDropdown({
  value,
  onValueChange,
  subdivisions,
  disabled = false,
  placeholder = 'Όλοι οι τομείς',
  allLabel = 'Όλοι οι τομείς',
  searchPlaceholder = 'Αναζήτηση τομέα...',
  emptyMessage = 'Δεν βρέθηκαν τομείς.',
  className,
  fullWidth = true,
}: SubdivisionDropdownProps) {
  // Add "all" option to the beginning and ensure label is always present
  const optionsWithAll = [
    { id: 'all', label: allLabel },
    ...subdivisions.map((subdiv) => ({
      ...subdiv,
      label: subdiv.label || subdiv.name || subdiv.id,
    })),
  ];

  return (
    <LazyCombobox
      options={optionsWithAll}
      value={value || 'all'}
      onSelect={(option) =>
        onValueChange(option.id === 'all' ? '' : option.id)
      }
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      disabled={disabled}
      initialLimit={20}
      loadMoreIncrement={20}
      searchLimit={100}
      className={cn(fullWidth && 'w-full min-w-48', className)}
    />
  );
}

interface TypeDropdownProps {
  value: string | undefined;
  onValueChange: (value: string) => void;
  placeholder?: string;
  allLabel?: string;
  className?: string;
  fullWidth?: boolean;
}

const typeOptions = [
  { id: 'all', label: 'Όλοι' },
  { id: 'pros', label: 'Μόνο Επαγγελματίες' },
  { id: 'companies', label: 'Μόνο Επιχειρήσεις' },
];

export function TypeDropdown({
  value,
  onValueChange,
  placeholder = 'Τύπος',
  allLabel = 'Όλοι',
  className,
  fullWidth = true,
}: TypeDropdownProps) {
  return (
    <Selectbox
      options={typeOptions}
      value={value || 'all'}
      onValueChange={(val) => onValueChange(val === 'all' ? '' : val)}
      placeholder={placeholder}
      className={cn(fullWidth && 'min-w-48', className)}
      fullWidth={fullWidth}
    />
  );
}
