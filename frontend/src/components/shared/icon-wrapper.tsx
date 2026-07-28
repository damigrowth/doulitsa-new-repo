import React from 'react';
import { cn } from '@/lib/utils';

interface IconWrapperProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'secondary' | 'accent' | 'muted' | 'brand';
  backgroundOpacity?: 'light' | 'medium' | 'full';
  hoverEffect?: boolean;
}

const sizeClasses = {
  sm: 'text-lg', // ~18px
  md: 'text-xl', // ~20px
  lg: 'text-2xl', // ~24px
  xl: 'text-3xl', // ~30px
};

const backgroundSizes = {
  sm: 'before:h-6 before:w-6',
  md: 'before:h-7 before:w-7',
  lg: 'before:h-8 before:w-8',
  xl: 'before:h-10 before:w-10',
};

const variantClasses = {
  primary: 'text-primary before:bg-orangy',
  secondary: 'text-secondary before:bg-secondary/20',
  accent: 'text-accent before:bg-accent/20',
  muted: 'text-muted-foreground before:bg-muted',
  brand: 'text-primary before:bg-primary/10',
};

const hoverVariants = {
  primary: 'hover:before:bg-sixth',
  secondary: 'hover:before:bg-secondary/30',
  accent: 'hover:before:bg-accent/30',
  muted: 'hover:before:bg-muted/70',
  brand: 'hover:before:bg-primary/20 group-hover:before:bg-primary/20',
};

export default function IconWrapper({
  children,
  className,
  size = 'lg',
  variant = 'primary',
  backgroundOpacity = 'full',
  hoverEffect = true,
}: IconWrapperProps) {
  const baseClasses = 'relative inline-block z-10 transition-all duration-300 ease-in-out';
  
  const beforeClasses = [
    'before:content-[""]',
    'before:rounded-full',
    'before:absolute',
    'before:-bottom-1',
    'before:-right-2',
    'before:-z-10',
    'before:transition-all',
    'before:duration-300',
    'before:ease-in-out',
  ].join(' ');

  return (
    <div
      className={cn(
        baseClasses,
        beforeClasses,
        sizeClasses[size],
        backgroundSizes[size],
        variantClasses[variant],
        hoverEffect && hoverVariants[variant],
        className
      )}
    >
      {children}
    </div>
  );
}