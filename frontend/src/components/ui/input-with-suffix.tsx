import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputWithSuffixProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Text or symbol to display as suffix/prefix */
  suffix?: string;
  /** Position of the suffix */
  position?: 'left' | 'right';
  /** Additional styling for the suffix */
  suffixClassName?: string;
}

const InputWithSuffix = React.forwardRef<
  HTMLInputElement,
  InputWithSuffixProps
>(
  (
    { className, suffix, position = 'right', suffixClassName, ...props },
    ref,
  ) => {
    const inputElement = (
      <input
        className={cn(
          'flex h-9 w-full rounded-md border-2 border-input bg-white px-3 py-1 pr-10 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-25 md:text-sm',
          suffix && position === 'left' && 'pl-8',
          suffix && position === 'right' && 'pr-8',
          className,
        )}
        ref={ref}
        {...props}
      />
    );

    // If no suffix provided, return simple input
    if (!suffix) {
      return inputElement;
    }

    const suffixElement = (
      <span
        className={cn(
          'absolute top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none select-none',
          position === 'left' && 'left-3',
          position === 'right' && 'right-3',
          suffixClassName,
        )}
      >
        {suffix}
      </span>
    );

    return (
      <div className='relative'>
        {position === 'left' && suffixElement}
        {inputElement}
        {position === 'right' && suffixElement}
      </div>
    );
  },
);

InputWithSuffix.displayName = 'InputWithSuffix';

export { InputWithSuffix };
