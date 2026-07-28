'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '@/lib/hooks/archives/use-debounced-value';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';

export interface ServerSearchComboboxProps<T> {
  // Server search function
  onSearch: (query: string) => Promise<T[]>;

  // Selection handlers
  value?: T | null;
  onSelect: (item: T | null) => void;

  // Display formatters
  getLabel: (item: T) => string;
  getKey: (item: T) => string;
  renderItem?: (item: T) => React.ReactNode;
  renderSelected?: (item: T) => React.ReactNode;

  // Configuration
  placeholder?: string;
  emptyMessage?: string;
  minQueryLength?: number;
  debounceMs?: number;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
}

export function ServerSearchCombobox<T>({
  onSearch,
  value,
  onSelect,
  getLabel,
  getKey,
  renderItem,
  renderSelected,
  placeholder = 'Αναζήτηση...',
  emptyMessage = 'Δεν βρέθηκαν αποτελέσματα',
  minQueryLength = 2,
  debounceMs = 300,
  disabled = false,
  clearable = false,
  className,
}: ServerSearchComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [searchResults, setSearchResults] = useState<T[]>([]);
  const [lastResults, setLastResults] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedSearchQuery = useDebouncedValue(inputValue, debounceMs);

  // Auto-open popover when user types
  useEffect(() => {
    if (inputValue.length > 0 && !open) {
      setOpen(true);
    }
  }, [inputValue, open]);

  // Fetch results when debounced query changes
  useEffect(() => {
    const fetchResults = async () => {
      if (debouncedSearchQuery.trim().length < minQueryLength) {
        setSearchResults([]);
        return;
      }

      setIsLoading(true);

      try {
        const results = await onSearch(debouncedSearchQuery);
        setSearchResults(results);
        // Cache results for later use
        if (results.length > 0) {
          setLastResults(results);
        }
      } catch (error) {
        console.error('Server search error:', error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [debouncedSearchQuery, onSearch, minQueryLength]);

  // Reset search when popover closes
  useEffect(() => {
    if (!open) {
      setInputValue('');
      setSearchResults([]);
    }
  }, [open]);

  const handleSelect = (item: T) => {
    onSelect(item);
    setInputValue('');
    setOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setInputValue('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          onClick={() => inputRef.current?.focus()}
          className={cn(
            'relative flex flex-row flex-wrap items-center gap-2 rounded-md bg-white shadow border-2 border-input px-4 py-2 text-sm ring-offset-background focus-within:ring-1 focus-within:ring-ring cursor-text',
            disabled && 'opacity-50 cursor-not-allowed',
            className,
          )}
        >
          {/* Selected item display - always show when selected */}
          {value && renderSelected ? (
            <div className='mr-2 flex items-center gap-2'>
              {renderSelected(value)}
            </div>
          ) : null}

          {/* Search input */}
          <input
            ref={inputRef}
            type='text'
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => {
              // Always open dropdown on focus if there are results or a value
              if (value || searchResults.length > 0) {
                setOpen(true);
              }
            }}
            placeholder={value && !inputValue ? '' : placeholder}
            disabled={disabled}
            className='flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50'
          />

          {/* Loading indicator */}
          {isLoading && (
            <Loader2 className='h-4 w-4 shrink-0 animate-spin text-muted-foreground' />
          )}

          {/* Clear button */}
          {clearable && value && (
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              disabled={disabled}
              className='h-4 w-4 shrink-0 opacity-50 hover:opacity-100 transition-opacity disabled:cursor-not-allowed'
            >
              <X className='h-4 w-4' />
            </button>
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent
        className='w-full p-0'
        side='bottom'
        align='start'
        onOpenAutoFocus={(e) => {
          // Prevent popover from stealing focus from input
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <Command shouldFilter={false}>
          <CommandList>
            {(() => {
              // Determine which results to display
              const displayResults =
                inputValue.trim().length === 0 && value
                  ? lastResults // Show cached results when refocusing with selection
                  : searchResults; // Show live search results

              if (isLoading && inputValue.trim().length >= minQueryLength) {
                return (
                  <div className='p-4 text-center text-sm text-muted-foreground'>
                    <Loader2 className='h-4 w-4 animate-spin mx-auto mb-2' />
                    Αναζήτηση...
                  </div>
                );
              }

              if (displayResults.length === 0) {
                // Only show "type 2 chars" if actively typing with insufficient length
                if (
                  inputValue.trim().length > 0 &&
                  inputValue.trim().length < minQueryLength
                ) {
                  return (
                    <CommandEmpty>
                      Πληκτρολογήστε τουλάχιστον {minQueryLength} χαρακτήρες
                    </CommandEmpty>
                  );
                }
                return <CommandEmpty>{emptyMessage}</CommandEmpty>;
              }

              return (
                <CommandGroup>
                  {displayResults.map((item) => (
                    <CommandItem
                      key={getKey(item)}
                      value={getKey(item)}
                      onSelect={() => handleSelect(item)}
                      className={cn(
                        value && getKey(value) === getKey(item) && 'bg-muted'
                      )}
                    >
                      {renderItem ? renderItem(item) : getLabel(item)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })()}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
