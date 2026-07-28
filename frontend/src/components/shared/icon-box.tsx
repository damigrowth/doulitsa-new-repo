import React from 'react';
import { cn } from '@/lib/utils';
import IconWrapper from './icon-wrapper';

interface IconBoxProps {
  icon?: React.ReactNode;
  title: string;
  value?: string | number | React.ReactNode;
  className?: string;
  iconSize?: 'sm' | 'md' | 'lg' | 'xl';
  iconVariant?: 'primary' | 'secondary' | 'accent' | 'muted' | 'brand';
  titleClassName?: string;
  valueClassName?: string;
  showIcon?: boolean;
}

export default function IconBox({
  icon,
  title,
  value,
  className,
  iconSize = 'lg',
  iconVariant = 'primary',
  titleClassName,
  valueClassName,
  showIcon = true,
}: IconBoxProps) {
  return (
    <div className={cn('flex items-start gap-4', className)}>
      {/* Icon with wrapper */}
      {showIcon && (
        <div className='flex-shrink-0'>
          <IconWrapper size={iconSize} variant={iconVariant}>
            {icon}
          </IconWrapper>
        </div>
      )}
      {/* Content */}
      <div className='flex-1 min-w-0'>
        <h5
          className={cn(
            'text-sm font-bold text-foreground leading-tight',
            titleClassName,
          )}
        >
          {title}
        </h5>
        {value && (
          <div
            className={cn(
              'text-sm font-medium text-muted-foreground mb-0',
              valueClassName,
            )}
          >
            {value}
          </div>
        )}
      </div>
    </div>
  );
}
