'use client';

import * as React from 'react';
import {
  Check,
  ChevronsUpDown,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import type { DatasetItem } from '@/lib/types/datasets';

interface TaxonomyPath {
  category: string;
  subcategory: string;
  subdivision: string;
  categoryLabel?: string;
  subcategoryLabel?: string;
  subdivisionLabel?: string;
}

interface TaxonomySelectorProps {
  taxonomies: DatasetItem[];
  value?: TaxonomyPath | null;
  onValueChange?: (value: TaxonomyPath | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  textSize?: 'sm' | 'xs' | 'default';
}

export default function TaxonomySelector({
  taxonomies,
  value,
  onValueChange,
  placeholder = 'Επιλέξτε κατηγορία...',
  disabled = false,
  className,
  textSize = 'default',
}: TaxonomySelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');
  const [currentLevel, setCurrentLevel] = React.useState<
    'category' | 'subcategory' | 'subdivision'
  >('category');
  const [selectedCategory, setSelectedCategory] =
    React.useState<DatasetItem | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] =
    React.useState<DatasetItem | null>(null);

  // Initialize selected items from value and set appropriate level
  React.useEffect(() => {
    if (value?.category) {
      const category = taxonomies.find((cat) => cat.id === value.category);
      setSelectedCategory(category || null);

      if (value.subcategory && category) {
        const subcategory = category.children?.find(
          (sub) => sub.id === value.subcategory,
        );
        setSelectedSubcategory(subcategory || null);

        if (value.subdivision && subcategory) {
          // We have a subdivision selected, so we're at subdivision level
          setCurrentLevel('subdivision');
        } else {
          // We have a subcategory but no subdivision, so we're at subcategory level
          setCurrentLevel('subcategory');
        }
      } else {
        // We have a category but no subcategory, so we're at category level
        setSelectedSubcategory(null);
        setCurrentLevel('category');
      }
    } else {
      // No selection, start at category level
      setSelectedCategory(null);
      setSelectedSubcategory(null);
      setCurrentLevel('category');
    }
  }, [value, taxonomies]);

  // Generate display items based on current level and selections
  const displayItems = React.useMemo(() => {
    if (currentLevel === 'category') {
      return taxonomies;
    } else if (currentLevel === 'subcategory' && selectedCategory) {
      return selectedCategory.children || [];
    } else if (currentLevel === 'subdivision' && selectedSubcategory) {
      return selectedSubcategory.children || [];
    }
    return [];
  }, [currentLevel, selectedCategory, selectedSubcategory, taxonomies]);

  // Filter items based on search
  const filteredItems = React.useMemo(() => {
    if (!searchValue) return displayItems;
    return displayItems.filter((item) =>
      item.label.toLowerCase().includes(searchValue.toLowerCase()),
    );
  }, [displayItems, searchValue]);

  const handleSelect = (item: DatasetItem) => {
    if (currentLevel === 'category') {
      setSelectedCategory(item);
      setSelectedSubcategory(null);
      if (item.children && item.children.length > 0) {
        setCurrentLevel('subcategory');
        setSearchValue('');
      } else {
        // No subcategories, set final value
        const newValue: TaxonomyPath = {
          category: item.id,
          subcategory: '',
          subdivision: '',
          categoryLabel: item.label,
          subcategoryLabel: '',
          subdivisionLabel: '',
        };
        onValueChange?.(newValue);
        setOpen(false);
        setCurrentLevel('category');
        setSearchValue('');
      }
    } else if (currentLevel === 'subcategory') {
      setSelectedSubcategory(item);
      if (item.children && item.children.length > 0) {
        setCurrentLevel('subdivision');
        setSearchValue('');
      } else {
        // No subdivisions, set final value
        const newValue: TaxonomyPath = {
          category: selectedCategory!.id,
          subcategory: item.id,
          subdivision: '',
          categoryLabel: selectedCategory!.label,
          subcategoryLabel: item.label,
          subdivisionLabel: '',
        };
        onValueChange?.(newValue);
        setOpen(false);
        setCurrentLevel('category');
        setSearchValue('');
      }
    } else if (currentLevel === 'subdivision') {
      // Final selection
      const newValue: TaxonomyPath = {
        category: selectedCategory!.id,
        subcategory: selectedSubcategory!.id,
        subdivision: item.id,
        categoryLabel: selectedCategory!.label,
        subcategoryLabel: selectedSubcategory!.label,
        subdivisionLabel: item.label,
      };
      onValueChange?.(newValue);
      setOpen(false);
      setCurrentLevel('category');
      setSearchValue('');
    }
  };

  const handleBack = () => {
    if (currentLevel === 'subdivision') {
      setCurrentLevel('subcategory');
    } else if (currentLevel === 'subcategory') {
      setCurrentLevel('category');
      setSelectedCategory(null);
    }
    setSearchValue('');
  };

  const handleClear = () => {
    onValueChange?.(null);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setCurrentLevel('category');
    setSearchValue('');
    setOpen(false);
  };

  const getDisplayValue = () => {
    if (!value || !value.category) return placeholder;

    const parts = [];
    if (value.categoryLabel) parts.push(value.categoryLabel);
    if (value.subcategoryLabel) parts.push(value.subcategoryLabel);
    if (value.subdivisionLabel) parts.push(value.subdivisionLabel);

    return parts.join(' → ');
  };

  const getLevelTitle = () => {
    switch (currentLevel) {
      case 'category':
        return 'Επιλέξτε Κατηγορία';
      case 'subcategory':
        return `${selectedCategory?.label}`;
      case 'subdivision':
        return `${selectedSubcategory?.label}`;
      default:
        return 'Επιλέξτε';
    }
  };

  const getTextSizeClasses = () => {
    switch (textSize) {
      case 'xs':
        return 'text-xs';
      case 'sm':
        return 'text-sm';
      case 'default':
      default:
        return '';
    }
  };

  const isCurrentlySelected = (item: DatasetItem) => {
    if (currentLevel === 'category') {
      return value?.category === item.id;
    } else if (currentLevel === 'subcategory') {
      return value?.subcategory === item.id;
    } else if (currentLevel === 'subdivision') {
      return value?.subdivision === item.id;
    }
    return false;
  };

  return (
    <div className={cn('relative', className)}>
      <div className='relative'>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div
              role='combobox'
              aria-expanded={open}
              className='group relative flex items-center rounded-md bg-white border-2 border-input px-4 py-2 text-sm ring-offset-background focus-within:ring-1 focus-within:ring-ring cursor-pointer'
              onClick={() => !disabled && setOpen(!open)}
            >
              <div className='flex flex-wrap gap-1 flex-1 pr-8'>
                {value && value.category ? (
                  <div className='flex flex-wrap gap-1 items-center'>
                    <Badge
                      variant='default'
                      className={cn(
                        'hover:bg-primary/90',
                        getTextSizeClasses(),
                      )}
                    >
                      {value.categoryLabel}
                    </Badge>
                    {value.subcategoryLabel && (
                      <>
                        <ChevronRight className='h-3 w-3 text-muted-foreground' />
                        <Badge
                          variant='default'
                          className={cn(
                            'hover:bg-primary/90',
                            getTextSizeClasses(),
                          )}
                        >
                          {value.subcategoryLabel}
                        </Badge>
                      </>
                    )}
                    {value.subdivisionLabel && (
                      <>
                        <ChevronRight className='h-3 w-3 text-muted-foreground' />
                        <Badge
                          variant='default'
                          className={cn(
                            'hover:bg-primary/90',
                            getTextSizeClasses(),
                          )}
                        >
                          {value.subdivisionLabel}
                        </Badge>
                      </>
                    )}
                  </div>
                ) : (
                  <span className='text-muted-foreground placeholder:text-muted-foreground'>
                    {placeholder}
                  </span>
                )}
              </div>
              <ChevronsUpDown className='h-4 w-4 shrink-0 opacity-50 absolute right-8 top-1/2 -translate-y-1/2' />
            </div>
          </PopoverTrigger>
          <PopoverContent className='w-[400px] p-0' align='start'>
            <Command>
              <div className='flex items-center justify-between p-2 border-b'>
                <div className='flex items-center gap-2'>
                  {currentLevel !== 'category' && (
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={handleBack}
                      className='h-8 w-8 p-0'
                    >
                      <ChevronLeft className='h-4 w-4' />
                    </Button>
                  )}
                  <span className='font-medium text-sm'>{getLevelTitle()}</span>
                </div>
              </div>
              <CommandInput
                placeholder={`Αναζήτηση...`}
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <CommandList>
                <CommandEmpty>Δεν βρέθηκαν αποτελέσματα.</CommandEmpty>
                <CommandGroup>
                  {filteredItems.map((item) => {
                    const isSelected = isCurrentlySelected(item);
                    return (
                      <CommandItem
                        key={item.id}
                        value={item.label}
                        onSelect={() => handleSelect(item)}
                        className={cn(
                          'flex items-center justify-between cursor-pointer',
                          isSelected
                            ? 'bg-primary text-primary-foreground data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground'
                            : 'hover:bg-accent hover:text-accent-foreground',
                        )}
                      >
                        <div className='flex items-center gap-2'>
                          <span>{item.label}</span>
                        </div>
                        {item.children && item.children.length > 0 && (
                          <span
                            className={cn(
                              'text-xs',
                              isSelected
                                ? 'text-primary-foreground/70'
                                : 'text-muted-foreground',
                            )}
                          >
                            {item.children.length} επιλογές
                          </span>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Clear button - positioned absolutely to avoid nesting */}
        {value && value.category && (
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-muted outline-none focus:ring-1 focus:ring-ring h-fit'
            onClick={handleClear}
            disabled={disabled}
          >
            <X className='h-4 w-4 text-muted-foreground hover:text-foreground' />
          </Button>
        )}
      </div>
    </div>
  );
}
