'use client';

/**
 * FormButton - A reusable button component with loading states and icons
 * 
 * @example
 * // Basic usage
 * <FormButton text="Save" icon="save" onClick={handleSave} />
 * 
 * // With loading state
 * <FormButton text="Saving..." loading={isLoading} icon="save" />
 * 
 * // Submit button with custom icon position
 * <FormButton 
 *   text="Submit" 
 *   type="submit" 
 *   icon="send" 
 *   iconPosition="left"
 *   variant="default"
 *   fullWidth 
 * />
 * 
 * // Destructive action
 * <FormButton text="Delete" icon="delete" variant="destructive" />
 */

import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Save,
  Trash2,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Send,
  Heart,
  Plus,
  Minus,
  Edit,
  Settings,
  RefreshCw,
  Loader2,
} from 'lucide-react';

// Icon mapping for easy usage
const iconMap = {
  save: Save,
  delete: Trash2,
  'arrow-right': ArrowRight,
  'arrow-left': ArrowLeft,
  'arrow-up': ArrowUp,
  'arrow-down': ArrowDown,
  'angle-right': ChevronRight,
  'angle-left': ChevronLeft,
  check: Check,
  times: X,
  submit: Send,
  send: Send,
  heart: Heart,
  plus: Plus,
  minus: Minus,
  edit: Edit,
  settings: Settings,
  refresh: RefreshCw,
  loading: Loader2,
} as const;

export type IconType = keyof typeof iconMap;

export interface FormButtonProps extends Omit<ButtonProps, 'children'> {
  /** Button text content */
  text: string;
  /** Whether the button is in loading state */
  loading?: boolean;
  /** Icon to display (predefined icon names) */
  icon?: IconType;
  /** Custom icon component (overrides the icon prop) */
  customIcon?: React.ComponentType<{ className?: string }>;
  /** Icon position relative to text */
  iconPosition?: 'left' | 'right';
  /** Loading text to show when loading is true */
  loadingText?: string;
  /** Full width button */
  fullWidth?: boolean;
  /** Additional className for the button */
  className?: string;
  /** Button type (submit, button, reset) */
  type?: 'submit' | 'button' | 'reset';
  /** Click handler */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Whether the button is disabled */
  disabled?: boolean;
}

const FormButton = React.forwardRef<HTMLButtonElement, FormButtonProps>(
  (
    {
      text,
      loading = false,
      icon,
      customIcon,
      iconPosition = 'right',
      loadingText,
      fullWidth = false,
      className,
      type = 'button',
      onClick,
      disabled = false,
      variant = 'submit',
      size = 'default',
      ...props
    },
    ref
  ) => {
    // Determine if button should be disabled
    const isDisabled = disabled || loading;

    // Get the icon component
    const IconComponent = customIcon || (icon ? iconMap[icon] : null);

    // Determine text to display
    const displayText = loading && loadingText ? loadingText : text;

    // Icon classes
    const iconClasses = 'h-4 w-4 flex-shrink-0';

    // Render icon or loading spinner
    const renderIconOrSpinner = () => {
      if (loading) {
        return <Loader2 className="h-4 w-4 animate-spin" />;
      }
      
      if (IconComponent) {
        return <IconComponent className={iconClasses} />;
      }
      
      return null;
    };

    return (
      <Button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={isDisabled}
        variant={variant}
        size={size}
        className={cn(
          'relative',
          fullWidth && 'w-full',
          loading && 'cursor-wait',
          className
        )}
        {...props}
      >
        {/* Left icon/spinner */}
        {iconPosition === 'left' && renderIconOrSpinner()}
        
        {/* Button text */}
        <span className={cn(
          'transition-opacity',
          loading && !loadingText && 'opacity-75'
        )}>
          {displayText}
        </span>
        
        {/* Right icon/spinner */}
        {iconPosition === 'right' && renderIconOrSpinner()}
      </Button>
    );
  }
);

FormButton.displayName = 'FormButton';

export default FormButton;