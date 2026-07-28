'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SearchDropdown } from '@/components/ui/search-dropdown';
import { searchServiceSuggestions } from '@/actions/search/search-services';
import type { SearchSuggestionsResult } from '@/lib/types/search';

const PLACEHOLDER = 'Αναζήτηση...';

// Shared search behaviour identical to the homepage hero search.
function useServiceSearch() {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [suggestions, setSuggestions] =
    React.useState<SearchSuggestionsResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const fetchSuggestions = React.useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setSuggestions(null);
      setIsDropdownOpen(false);
      return;
    }

    setIsLoading(true);
    setIsDropdownOpen(true);

    try {
      const result = await searchServiceSuggestions(searchQuery);
      if (result.success && result.data) {
        setSuggestions(result.data);
      } else {
        setSuggestions({ taxonomies: [], services: [], hasResults: false });
      }
    } catch (error) {
      console.error('Search error:', error);
      setSuggestions(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  const searchFor = (value: string) => {
    const trimmedQuery = value.trim();
    if (trimmedQuery) {
      router.push(`/ipiresies?search=${encodeURIComponent(trimmedQuery)}`);
    } else {
      router.push('/ipiresies');
    }
    setIsDropdownOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchFor(query);
  };

  const handleSelectSuggestion = (url: string) => {
    router.push(url);
    setQuery('');
    setIsDropdownOpen(false);
  };

  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    query,
    suggestions,
    isLoading,
    isDropdownOpen,
    setIsDropdownOpen,
    handleInputChange,
    handleSubmit,
    handleSelectSuggestion,
    searchFor,
  };
}

// Compact search field for the header. Width is controlled via className.
function HeaderSearchField({ className }: { className?: string }) {
  const {
    query,
    suggestions,
    isLoading,
    isDropdownOpen,
    setIsDropdownOpen,
    handleInputChange,
    handleSubmit,
    handleSelectSuggestion,
    searchFor,
  } = useServiceSearch();

  return (
    <form onSubmit={handleSubmit} className={cn('relative', className)}>
      <SearchDropdown
        suggestions={suggestions}
        isLoading={isLoading}
        open={isDropdownOpen}
        onOpenChange={setIsDropdownOpen}
        onSelectSuggestion={handleSelectSuggestion}
        query={query}
        onSearch={searchFor}
        matchTriggerWidth={false}
        contentClassName='w-[max(var(--radix-popover-trigger-width),320px)] max-w-[calc(100vw-2rem)]'
        align='end'
      >
        <div className='relative z-10 flex h-10 w-full items-center gap-2 rounded-full border border-gray-300 bg-white pl-4 pr-1.5 shadow-sm transition-colors duration-300 ease-in-out focus-within:border-primary hover:border-gray-400'>
          <input
            type='text'
            value={query}
            onChange={handleInputChange}
            onFocus={() => {
              if (query.trim().length >= 2 && suggestions) {
                setIsDropdownOpen(true);
              }
            }}
            placeholder={PLACEHOLDER}
            className='w-full min-w-0 flex-1 border-none bg-transparent text-sm font-sans text-foreground outline-none placeholder:text-gray-500 focus:border-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0'
            role='combobox'
            aria-label='Αναζήτηση υπηρεσιών'
            aria-autocomplete='list'
            aria-expanded={isDropdownOpen}
            aria-controls='search-suggestions-listbox'
            aria-haspopup='listbox'
            autoComplete='off'
          />
          <Button
            type='submit'
            className='h-7 w-7 shrink-0 rounded-full bg-primary p-0 text-primary-foreground transition-all duration-300 ease-in-out hover:bg-primary-dark'
            aria-label='Αναζήτηση'
          >
            <Search className='h-4 w-4' />
          </Button>
        </div>
      </SearchDropdown>
    </form>
  );
}

// Search box for the header. Width is controlled by the parent via className.
export function HeaderSearch({ className }: { className?: string }) {
  return <HeaderSearchField className={className} />;
}
