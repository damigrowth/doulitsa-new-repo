'use client';

import * as React from 'react';
import { Loader2, Search } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from '@/components/ui/popover';
import type { SearchSuggestionsResult } from '@/lib/types/search';
import { NextLink } from '@/components';
import { FlaticonCategory } from '@/components/icon';
import { cn } from '@/lib/utils';

export interface SearchDropdownProps {
  suggestions: SearchSuggestionsResult | null;
  isLoading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSuggestion: (url: string) => void;
  children: React.ReactNode;
  /** Current query text, used to render the "search for ..." action. */
  query?: string;
  /** Runs a full-text search for the given query (same as pressing Enter). */
  onSearch?: (query: string) => void;
  /** Extra classes for the dropdown content (e.g. a min-width on narrow triggers). */
  contentClassName?: string;
  /** Horizontal alignment of the dropdown relative to the trigger. Defaults to 'start'. */
  align?: 'start' | 'center' | 'end';
  /**
   * When true, the dropdown width is locked to the trigger width.
   * When false, the trigger width becomes only a lower bound so the dropdown
   * can grow wider than the trigger (controlled via `contentClassName`).
   * Defaults to true.
   */
  matchTriggerWidth?: boolean;
}

export function SearchDropdown({
  suggestions,
  isLoading,
  open,
  onOpenChange,
  onSelectSuggestion,
  children,
  query,
  onSearch,
  contentClassName,
  align = 'start',
  matchTriggerWidth = true,
}: SearchDropdownProps) {
  const trimmedQuery = query?.trim() ?? '';
  const showSearchAll = trimmedQuery.length > 0 && Boolean(onSearch);
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>{children}</PopoverAnchor>
      <PopoverContent
        className={cn(
          'p-0 text-left',
          matchTriggerWidth
            ? 'w-[--radix-popover-trigger-width]'
            : 'w-auto',
          contentClassName,
        )}
        align={align}
        side='bottom'
        sideOffset={8}
        collisionPadding={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList
            id='search-suggestions-listbox'
            role='listbox'
            className='max-h-[min(60vh,var(--radix-popover-content-available-height))]'
          >
            {/* Search for "<query>" action - works like pressing Enter */}
            {showSearchAll && (
              <>
                <CommandGroup>
                  <CommandItem
                    value={`search-all-${trimmedQuery}`}
                    onSelect={() => {
                      onSearch?.(trimmedQuery);
                      onOpenChange(false);
                    }}
                    className='flex items-center gap-3 cursor-pointer'
                  >
                    <Search
                      size={16}
                      className='text-muted-foreground'
                      aria-hidden='true'
                    />
                    <span className='flex-1 truncate text-sm'>
                      Αναζήτηση για{' '}
                      <span className='font-semibold'>«{trimmedQuery}»</span>
                    </span>
                  </CommandItem>
                </CommandGroup>
                {suggestions?.hasResults && <CommandSeparator />}
              </>
            )}

            {isLoading ? (
              <div className='flex items-center justify-center py-6'>
                <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
                <span className='ml-2 text-sm text-muted-foreground'>
                  Αναζήτηση...
                </span>
              </div>
            ) : !suggestions || !suggestions.hasResults ? (
              !showSearchAll && (
                <CommandEmpty>Δεν βρέθηκαν αποτελέσματα</CommandEmpty>
              )
            ) : (
              <>
                {/* Taxonomy Suggestions */}
                {suggestions.taxonomies.length > 0 && (
                  <CommandGroup
                    heading='Κατηγορίες'
                    className='[&_[cmdk-group-heading]]:text-left [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold'
                  >
                    {suggestions.taxonomies.map((taxonomy) => (
                      <CommandItem
                        key={taxonomy.id}
                        value={taxonomy.label}
                        onSelect={() => {
                          onSelectSuggestion(taxonomy.url);
                          onOpenChange(false);
                        }}
                        asChild
                      >
                        <NextLink
                          href={taxonomy.url}
                          className='flex items-center gap-3 cursor-pointer'
                        >
                          <FlaticonCategory size={16} className='text-muted-foreground' />
                          <div className='flex-1 min-w-0'>
                            <p className='text-sm font-medium truncate'>
                              {taxonomy.label}
                            </p>
                            <p className='text-xs text-muted-foreground truncate'>
                              {taxonomy.category}
                            </p>
                          </div>
                        </NextLink>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Service Suggestions */}
                {suggestions.services.length > 0 && (
                  <CommandGroup
                    heading='Υπηρεσίες'
                    className='[&_[cmdk-group-heading]]:text-left [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold'
                  >
                    {suggestions.services.map((service) => (
                      <CommandItem
                        key={service.id}
                        value={service.title}
                        onSelect={() => {
                          onSelectSuggestion(service.url);
                          onOpenChange(false);
                        }}
                        asChild
                      >
                        <NextLink
                          href={service.url}
                          className='flex items-center gap-3 cursor-pointer'
                        >
                          <div className='flex-1 min-w-0'>
                            <p className='text-sm font-medium truncate'>
                              {service.title}
                            </p>
                            <p className='text-xs text-muted-foreground truncate'>
                              {service.category}
                            </p>
                          </div>
                        </NextLink>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
