import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface AdminSearchInputProps {
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

/**
 * Reusable search input component for admin filters
 *
 * Provides consistent search UI across all admin sections with:
 * - Search icon
 * - Consistent styling
 * - Controlled input behavior
 *
 * @example
 * ```tsx
 * <AdminSearchInput
 *   placeholder="Search services..."
 *   value={searchValue}
 *   onChange={(e) => setSearchValue(e.target.value)}
 * />
 * ```
 */
export function AdminSearchInput({
  placeholder,
  value,
  onChange,
  className,
}: AdminSearchInputProps) {
  return (
    <div className='flex-1 relative'>
      <Search className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`pl-9 ${className || ''}`}
      />
    </div>
  );
}
