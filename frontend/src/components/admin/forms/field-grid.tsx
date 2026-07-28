import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FieldGridProps {
  children: ReactNode;
  className?: string;
}

/**
 * Grid container for form fields with 2-column responsive layout
 */
export function FieldGrid({ children, className }: FieldGridProps) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-2', className)}>
      {children}
    </div>
  );
}
