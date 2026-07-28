'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils/index';
import { Button } from '@/components/ui/button';
import { SearchDropdown } from '@/components/ui/search-dropdown';
import { searchServiceSuggestions } from '@/actions/search/search-services';
import type { SearchSuggestionsResult } from '@/lib/types/search';

export interface HomeSearchProps
  extends React.FormHTMLAttributes<HTMLFormElement> {
  placeholder?: string;
  buttonText?: string;
}

const HomeSearch = React.forwardRef<HTMLFormElement, HomeSearchProps>(
  (
    {
      className,
      placeholder = 'Τι υπηρεσία ψάχνεις;',
      buttonText = 'Αναζήτηση',
      ...props
    },
    ref,
  ) => {
    const router = useRouter();
    const [query, setQuery] = React.useState('');
    const [suggestions, setSuggestions] =
      React.useState<SearchSuggestionsResult | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
    const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    // Fetch suggestions with debouncing
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
          setSuggestions({
            taxonomies: [],
            services: [],
            hasResults: false,
          });
        }
      } catch (error) {
        console.error('Search error:', error);
        setSuggestions(null);
      } finally {
        setIsLoading(false);
      }
    }, []);

    // Handle input change with debouncing
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer for debounced search
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(value);
      }, 300);
    };

    // Run a full-text search (used by submit and the "search for ..." action)
    const searchFor = (value: string) => {
      const trimmedQuery = value.trim();
      if (trimmedQuery) {
        router.push(`/ipiresies?search=${encodeURIComponent(trimmedQuery)}`);
      } else {
        router.push('/ipiresies');
      }
      setIsDropdownOpen(false);
    };

    // Handle form submission
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      searchFor(query);
    };

    // Handle suggestion selection
    const handleSelectSuggestion = (url: string) => {
      router.push(url);
      setQuery('');
    };

    // Cleanup debounce timer
    React.useEffect(() => {
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }, []);

    return (
      <form onSubmit={handleSubmit} ref={ref} className='relative' {...props}>
        <SearchDropdown
          suggestions={suggestions}
          isLoading={isLoading}
          open={isDropdownOpen}
          onOpenChange={setIsDropdownOpen}
          onSelectSuggestion={handleSelectSuggestion}
          query={query}
          onSearch={searchFor}
        >
          <div
            className={cn(
              'relative z-10 bg-white rounded-full border border-gray-400 p-2.5 max-w-[550px] mx-auto',
              className,
            )}
          >
            <div className='flex flex-row items-center min-h-[45px] gap-3'>
              {/* Search input section */}
              <div className='flex-1 md:w-2/3'>
                <div className='relative'>
                  <Search
                    className='hidden md:block absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 z-10'
                    size={16}
                    aria-hidden='true'
                  />
                  <input
                    type='text'
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => {
                      if (query.trim().length >= 2 && suggestions) {
                        setIsDropdownOpen(true);
                      }
                    }}
                    placeholder={placeholder}
                    className='w-full h-11 bg-transparent border-none outline-none focus:ring-0 focus:border-none rounded-full pl-5 md:pl-[50px] pr-4 py-2 text-[15px] font-sans placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0'
                    role='combobox'
                    aria-label='Αναζήτηση υπηρεσιών'
                    aria-autocomplete='list'
                    aria-expanded={isDropdownOpen}
                    aria-controls='search-suggestions-listbox'
                    aria-haspopup='listbox'
                    autoComplete='off'
                  />
                </div>
              </div>

              {/* Button section */}
              <div className='flex-shrink-0 md:w-1/3'>
                <div className='text-center md:text-left h-full flex items-center justify-center md:justify-end'>
                  <Button
                    type='submit'
                    className='w-11 aspect-square md:w-auto md:aspect-auto h-11 bg-secondary text-secondary-foreground hover:bg-fourth rounded-full md:rounded-[60px] p-0 md:px-5 md:py-1.5 text-[15px] border-none outline-none focus:outline-none focus:ring-0 transition-all duration-300 ease-in-out inline-flex items-center justify-center relative overflow-hidden md:text-center z-0'
                  >
                    <Search className='h-5 w-5 md:hidden' />
                    <span className='hidden md:inline font-semibold'>
                      {buttonText}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </SearchDropdown>
      </form>
    );
  },
);

HomeSearch.displayName = 'HomeSearch';

export { HomeSearch };
