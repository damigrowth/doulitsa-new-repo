'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Loader2, ChevronRight, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  PopoverAnchor,
} from '@/components/ui/popover';

export interface LazyComboboxOption {
  id: string;
  label: string;
  [key: string]: any; // Allow additional properties
}

export interface LazyComboboxProps {
  // Data
  options: LazyComboboxOption[];
  value?: string;
  onSelect: (option: LazyComboboxOption) => void;

  // React Hook Form integration - direct form control
  onChange?: (value: string) => void;

  // Optional clear handler (alternative to onChange)
  onClear?: () => void;

  // Control clear button visibility (default: false)
  clearable?: boolean;

  // Multi-select mode
  multiple?: boolean;
  values?: string[];
  onMultiSelect?: (options: LazyComboboxOption[]) => void;
  maxItems?: number;

  // Display
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  formatLabel?: (option: LazyComboboxOption) => React.ReactNode;
  getButtonLabel?: (option: LazyComboboxOption | undefined) => string;

  // Hierarchical Badge Display (optional)
  renderButtonContent?: (
    option: LazyComboboxOption | undefined,
  ) => React.ReactNode;

  // Lazy Loading
  initialLimit?: number;
  loadMoreThreshold?: number;
  loadMoreIncrement?: number;
  searchLimit?: number;

  // Trigger behavior
  trigger?: 'click' | 'search';

  // Styling
  className?: string;
  disabled?: boolean;

  // Progress indicator
  showProgress?: boolean;
  progressFormatter?: (current: number, total: number) => string;

  // Create new item support (pending taxonomy)
  allowCreate?: boolean;
  onCreateItem?: (label: string) => Promise<LazyComboboxOption | null>;
  pendingIds?: Set<string>;
  pendingBadgeText?: (count: number) => string;
}

export function LazyCombobox({
  options,
  value,
  onSelect,
  onChange,
  onClear,
  clearable = false,
  multiple = false,
  values = [],
  onMultiSelect,
  maxItems,
  placeholder = 'Επιλογή...',
  searchPlaceholder = 'Αναζήτηση...',
  emptyMessage = 'Δεν βρέθηκαν αποτελέσματα.',
  formatLabel,
  getButtonLabel,
  renderButtonContent,
  initialLimit = 20,
  loadMoreThreshold = 100,
  loadMoreIncrement = 20,
  searchLimit = 100,
  trigger = 'click',
  className,
  disabled = false,
  showProgress = true,
  progressFormatter = (current, total) => `${current} από ${total}`,
  allowCreate = false,
  onCreateItem,
  pendingIds,
  pendingBadgeText = (n) =>
    n === 1
      ? 'επιλεγμένο στοιχείο υπό έγκριση'
      : 'επιλεγμένα στοιχεία υπό έγκριση',
}: LazyComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [displayLimit, setDisplayLimit] = React.useState(initialLimit);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = React.useState('');
  const [isCreating, setIsCreating] = React.useState(false);
  const [createdOptions, setCreatedOptions] = React.useState<LazyComboboxOption[]>([]);

  // Merge externally-created options with the prop-provided ones
  const effectiveOptions = React.useMemo(() => {
    const existingIds = new Set(options.map((o) => o.id));
    const newOnes = createdOptions.filter((o) => !existingIds.has(o.id));
    return [...options, ...newOnes];
  }, [options, createdOptions]);

  // Merge parent pendingIds with locally created option IDs for pending styling
  const effectivePendingIds = React.useMemo(() => {
    if (createdOptions.length === 0) return pendingIds;
    const merged = new Set(pendingIds);
    for (const opt of createdOptions) merged.add(opt.id);
    return merged;
  }, [pendingIds, createdOptions]);

  // Reset display limit when popover closes
  React.useEffect(() => {
    if (!open) {
      setDisplayLimit(initialLimit);
      setSearchQuery('');
      setInputValue('');
    }
  }, [open, initialLimit]);

  // Auto-open popover when user types (search trigger mode)
  React.useEffect(() => {
    if (trigger === 'search') {
      // Auto-open only when user types
      if (inputValue.length > 0 && !open) {
        setOpen(true);
      }
      // Don't auto-close - let user control via blur/selection
    }
  }, [inputValue, open, trigger]);

  // Filter and display logic
  const { displayedOptions, totalFiltered, isSearching } = React.useMemo(() => {
    const activeSearchQuery = trigger === 'search' ? inputValue : searchQuery;
    const isSearching = activeSearchQuery.length > 0;

    // Filter based on search
    const filtered = isSearching
      ? effectiveOptions.filter((option) =>
          option.label.toLowerCase().includes(activeSearchQuery.toLowerCase()),
        )
      : effectiveOptions;

    // Apply limit
    let limited = isSearching
      ? filtered.slice(0, searchLimit)
      : filtered.slice(0, displayLimit);

    // ENSURE SELECTED OPTION IS ALWAYS VISIBLE (when not searching)
    if (!isSearching && (value || (multiple && values.length > 0))) {
      const selectedIds = multiple ? values : value ? [value] : [];
      const selected = effectiveOptions.filter((opt) => selectedIds.includes(opt.id));

      // Add selected options that aren't in limited view
      selected.forEach((sel) => {
        if (!limited.find((opt) => opt.id === sel.id)) {
          limited = [sel, ...limited.slice(0, -1)]; // Replace last with selected
        }
      });

      // Move selected to top for easy visibility (single select only)
      if (value && !multiple) {
        const selectedOption = limited.find((opt) => opt.id === value);
        if (selectedOption) {
          limited = [
            selectedOption,
            ...limited.filter((opt) => opt.id !== value),
          ];
        }
      }
    }

    return {
      displayedOptions: limited,
      totalFiltered: filtered.length,
      isSearching,
    };
  }, [
    effectiveOptions,
    searchQuery,
    inputValue,
    displayLimit,
    searchLimit,
    trigger,
    value,
    values,
    multiple,
  ]);

  // Show "create new" option when allowCreate is enabled, query >= 2 chars, and no exact match
  const showCreateOption = React.useMemo(() => {
    if (!allowCreate || !onCreateItem) return false;
    const activeQuery = trigger === 'search' ? inputValue : searchQuery;
    if (activeQuery.trim().length < 2) return false;
    const queryLower = activeQuery.trim().toLowerCase();
    const hasExactMatch = effectiveOptions.some(
      (opt) => opt.label.toLowerCase() === queryLower,
    );
    return !hasExactMatch;
  }, [allowCreate, onCreateItem, trigger, inputValue, searchQuery, effectiveOptions]);

  // Handle creating a new item
  const handleCreateItem = React.useCallback(async () => {
    if (!onCreateItem || isCreating) return;
    const activeQuery = (trigger === 'search' ? inputValue : searchQuery).trim();
    if (activeQuery.length < 2) return;

    setIsCreating(true);
    try {
      const newOption = await onCreateItem(activeQuery);
      if (newOption) {
        setCreatedOptions((prev) => [...prev, newOption]);
      }
      if (newOption && multiple && onMultiSelect) {
        // Add to current selections
        if (!maxItems || values.length < maxItems) {
          const newOptions = [
            ...effectiveOptions.filter((opt) => values.includes(opt.id)),
            newOption,
          ];
          onMultiSelect(newOptions);
        }
      } else if (newOption && !multiple) {
        onSelect(newOption);
      }
      setInputValue('');
      setSearchQuery('');
      setOpen(false);
    } finally {
      setIsCreating(false);
    }
  }, [
    onCreateItem,
    isCreating,
    trigger,
    inputValue,
    searchQuery,
    multiple,
    onMultiSelect,
    onSelect,
    values,
    effectiveOptions,
    maxItems,
  ]);

  // Scroll handler for lazy loading
  const handleScroll = React.useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (isSearching) return; // Don't paginate during search

      const target = event.currentTarget;
      const scrolledToBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight <
        loadMoreThreshold;

      if (scrolledToBottom && displayLimit < effectiveOptions.length) {
        setDisplayLimit((prev) =>
          Math.min(prev + loadMoreIncrement, effectiveOptions.length),
        );
      }
    },
    [
      isSearching,
      displayLimit,
      effectiveOptions.length,
      loadMoreThreshold,
      loadMoreIncrement,
    ],
  );

  // Get selected option(s)
  const selectedOption = React.useMemo(
    () => effectiveOptions.find((option) => option.id === value),
    [effectiveOptions, value],
  );

  const selectedOptions = React.useMemo(
    () => effectiveOptions.filter((option) => values.includes(option.id)),
    [effectiveOptions, values],
  );

  // Count of selected items that are pending approval
  const pendingCount = React.useMemo(() => {
    if (!effectivePendingIds || effectivePendingIds.size === 0) return 0;
    if (multiple) return values.filter((id) => effectivePendingIds.has(id)).length;
    return value && effectivePendingIds.has(value) ? 1 : 0;
  }, [effectivePendingIds, multiple, values, value]);

  // Multi-select handlers
  const handleMultiSelect = React.useCallback(
    (option: LazyComboboxOption) => {
      if (!onMultiSelect) return;

      const isSelected = values.includes(option.id);
      let newValues: string[];

      if (isSelected) {
        // Remove
        newValues = values.filter((id) => id !== option.id);
      } else {
        // Add (check max limit)
        if (maxItems && values.length >= maxItems) {
          return; // Don't add if max reached
        }
        newValues = [...values, option.id];
      }

      const newOptions = effectiveOptions.filter((opt) => newValues.includes(opt.id));
      onMultiSelect(newOptions);
    },
    [values, effectiveOptions, onMultiSelect, maxItems],
  );

  const handleRemoveBadge = React.useCallback(
    (optionId: string) => {
      if (!onMultiSelect) return;
      const newValues = values.filter((id) => id !== optionId);
      const newOptions = effectiveOptions.filter((opt) => newValues.includes(opt.id));
      onMultiSelect(newOptions);
    },
    [values, effectiveOptions, onMultiSelect],
  );

  // Button label
  const buttonLabel = React.useMemo(() => {
    if (multiple) {
      if (selectedOptions.length === 0) return placeholder;
      if (selectedOptions.length === 1) return selectedOptions[0].label;
      return `${selectedOptions.length} επιλεγμένα`;
    }

    if (getButtonLabel) {
      return getButtonLabel(selectedOption);
    }
    return selectedOption?.label || placeholder;
  }, [multiple, selectedOptions, selectedOption, getButtonLabel, placeholder]);

  // Option label formatter
  const renderLabel = React.useCallback(
    (option: LazyComboboxOption) => {
      if (formatLabel) {
        return formatLabel(option);
      }
      return option.label;
    },
    [formatLabel],
  );

  return (
    <>
    <Popover open={open} onOpenChange={setOpen}>
      {trigger === 'click' ? (
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            role='combobox'
            aria-expanded={open}
            className={cn(
              'w-full justify-between',
              'font-normal', // Always apply font-normal
              !value && !multiple && 'text-muted-foreground',
              values.length === 0 && multiple && 'text-muted-foreground',
              (renderButtonContent || multiple) &&
                'h-auto min-h-9 py-2',
              className,
            )}
            disabled={disabled}
          >
            {renderButtonContent ? (
              <div className='flex items-center flex-1 min-w-0'>
                {renderButtonContent(selectedOption)}
              </div>
            ) : multiple && selectedOptions.length > 0 ? (
              <div className='flex flex-wrap gap-1 flex-1'>
                {selectedOptions.map((option) => {
                  const isPending = effectivePendingIds?.has(option.id);
                  return (
                    <Badge
                      key={option.id}
                      variant={isPending ? 'outline' : 'default'}
                      className={cn(
                        'mr-1',
                        isPending &&
                          'border-orange-400 text-orange-600 bg-orange-50',
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveBadge(option.id);
                      }}
                    >
                      {option.label}
                      <X className='ml-1 h-3 w-3' />
                    </Badge>
                  );
                })}
              </div>
            ) : (
              buttonLabel
            )}
            <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
          </Button>
        </PopoverTrigger>
      ) : (
        <>
          <PopoverAnchor asChild>
            <div
              onClick={() => inputRef.current?.focus()}
              className={cn(
                'relative flex flex-row flex-wrap items-center gap-2 rounded-md bg-white shadow border-2 border-input px-4 py-2 text-sm ring-offset-background focus-within:ring-1 focus-within:ring-ring cursor-text',
                className,
              )}
            >
              {renderButtonContent && selectedOption
                ? renderButtonContent(selectedOption)
                : multiple && selectedOptions.length > 0
                  ? selectedOptions.map((option) => {
                      const isPending = effectivePendingIds?.has(option.id);
                      return (
                        <Badge
                          key={option.id}
                          variant={isPending ? 'outline' : 'default'}
                          className={cn(
                            'mr-1',
                            isPending &&
                              'border-orange-400 text-orange-600 bg-orange-50',
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveBadge(option.id);
                          }}
                        >
                          {option.label}
                          <X className='ml-1 h-3 w-3' />
                        </Badge>
                      );
                    })
                  : null}
              <input
                ref={inputRef}
                type='text'
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => {
                  // In search trigger mode with multi-select, don't auto-open
                  // This prevents showing all tags when adding 2nd, 3rd, 4th+ tags
                  if (trigger === 'search' && multiple) {
                    // Don't auto-open - let typing trigger it (via inputValue effect)
                    return;
                  }

                  // For single-select search OR click mode: auto-open if value exists
                  if (selectedOption || selectedOptions.length > 0) {
                    setOpen(true);
                  }
                }}
                placeholder={selectedOption && !inputValue ? '' : placeholder}
                disabled={disabled}
                className='flex-1 bg-subtle outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50'
              />
              {/* Clear button - right end of input (only if clearable enabled) */}
              {clearable && (selectedOption || selectedOptions.length > 0) && (
                <button
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation();
                    // Clear selection properly
                    if (multiple) {
                      onMultiSelect?.([]);
                    } else {
                      // Priority: onChange (RHF) > onClear (explicit) > silent (no crash)
                      if (onChange) {
                        onChange(''); // React Hook Form direct update
                      } else if (onClear) {
                        onClear(); // Explicit clear handler
                      }
                      // If neither provided, just clear visual state (don't call onSelect)
                    }
                    setInputValue('');
                    setOpen(false); // Close dropdown after clear
                  }}
                  className='h-4 w-4 shrink-0 opacity-50 hover:opacity-100 transition-opacity'
                >
                  <X className='h-3 w-3' />
                </button>
              )}
            </div>
          </PopoverAnchor>
        </>
      )}
      <PopoverContent
        className='w-full p-0'
        side='bottom'
        align='start'
        onOpenAutoFocus={(e) => {
          // Prevent popover from stealing focus from input in search mode
          if (trigger === 'search') {
            e.preventDefault();
            inputRef.current?.focus();
          }
        }}
      >
        <Command shouldFilter={false}>
          {trigger === 'click' && (
            <CommandInput
              placeholder={searchPlaceholder}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
          )}
          <CommandList ref={scrollRef} onScroll={handleScroll}>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {displayedOptions.map((option) => {
                const isSelected = multiple
                  ? values.includes(option.id)
                  : value === option.id;
                const isPending = effectivePendingIds?.has(option.id);

                return (
                  <CommandItem
                    key={option.id}
                    value={option.id}
                    onSelect={() => {
                      if (multiple) {
                        handleMultiSelect(option);
                        setOpen(false); // Close dropdown after tag selection
                      } else {
                        onSelect(option);
                        setOpen(false);
                      }
                      setInputValue(''); // Clear search input after selection
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        isSelected ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {isPending ? (
                      <span className='text-orange-600'>
                        {renderLabel(option)}
                      </span>
                    ) : (
                      renderLabel(option)
                    )}
                  </CommandItem>
                );
              })}

              {/* Create new item option */}
              {showCreateOption && (
                <CommandItem
                  value='__create_new__'
                  onSelect={handleCreateItem}
                  disabled={isCreating}
                  className='text-orange-600'
                >
                  {isCreating ? (
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  ) : (
                    <Plus className='mr-2 h-4 w-4' />
                  )}
                  Προσθήκη &quot;
                  {(trigger === 'search' ? inputValue : searchQuery).trim()}
                  &quot;
                </CommandItem>
              )}
            </CommandGroup>

            {/* Progress Indicator */}
            {showProgress && !isSearching && displayedOptions.length > 0 && (
              <div className='flex items-center justify-center gap-2 p-2 text-xs text-muted-foreground border-t'>
                {displayLimit < effectiveOptions.length ? (
                  <>
                    <Loader2 className='h-3 w-3 animate-spin' />
                    <span>
                      {progressFormatter(displayLimit, effectiveOptions.length)}
                    </span>
                  </>
                ) : (
                  <span>
                    {progressFormatter(effectiveOptions.length, effectiveOptions.length)}
                  </span>
                )}
              </div>
            )}

            {/* Search Results Indicator */}
            {showProgress && isSearching && displayedOptions.length > 0 && (
              <div className='p-2 text-xs text-center text-muted-foreground border-t'>
                {totalFiltered > searchLimit
                  ? `Εμφάνιση ${searchLimit} από ${totalFiltered} αποτελέσματα`
                  : `${totalFiltered} αποτελέσματα`}
              </div>
            )}

            {/* Multi-select Footer */}
            {multiple && (
              <div className='flex items-center justify-between p-2 text-xs border-t'>
                <span className='text-muted-foreground'>
                  {values.length} επιλεγμένα
                  {maxItems && ` (μέγιστο: ${maxItems})`}
                </span>
                {values.length > 0 && (
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-6 px-2 text-xs'
                    onClick={(e) => {
                      e.stopPropagation();
                      onMultiSelect?.([]);
                    }}
                  >
                    Καθαρισμός
                  </Button>
                )}
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    {pendingCount > 0 && (
      <div className='flex items-center gap-1.5 mt-1 text-xs text-orange-600'>
        <span className='h-2 w-2 rounded-full bg-orange-500 inline-block' />
        {pendingCount} {pendingBadgeText(pendingCount)}
      </div>
    )}
    </>
  );
}
