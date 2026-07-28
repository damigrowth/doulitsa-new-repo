import React from 'react';
import { CheckCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface VerifiedBadgeProps {
  /** Whether the entity is verified */
  verified?: boolean | null;
  /** Tooltip text to display */
  tooltipText?: string;
  /** Size variant of the icon */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Custom class name */
  className?: string;
  /** Custom ID for the component */
  id?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-7 w-7',
};

export default function VerifiedBadge({
  verified,
  tooltipText = 'Πιστοποιημένος Επαγγελματικός Λογαριασμός',
  size = 'xl',
  className,
  id = 'verified',
}: VerifiedBadgeProps) {
  if (verified === undefined || verified === null || verified === false) {
    return null;
  }

  const iconSizeClass = sizeClasses[size];

  return (
    <div id={id} className={className}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className='mb-0 inline-flex'>
            <CheckCircle
              className={cn(
                iconSizeClass,
                'text-green-600 fill-green-600/20 align-middle',
                className,
              )}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side='top'>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
