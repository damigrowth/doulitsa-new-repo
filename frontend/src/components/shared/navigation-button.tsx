'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface NavigationButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showBackIcon?: boolean;
}

/**
 * Client-side navigation button that uses window.location for hard navigation
 * This fully resets the app state, which is essential for error page navigation
 * to avoid cascading errors and ensure clean page loads
 */
export function NavigationButton({
  href,
  children,
  variant = 'default',
  size = 'lg',
  className = '',
  showBackIcon = false,
}: NavigationButtonProps) {
  const handleClick = () => {
    // Use window.location.href for hard navigation to fully reset error state
    window.location.href = href;
  };

  return (
    <Button
      onClick={handleClick}
      variant={variant}
      size={size}
      className={className}
    >
      {showBackIcon && <ArrowLeft className='w-4 h-4 mr-2' />}
      {children}
    </Button>
  );
}
