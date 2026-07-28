import React from 'react';
import { ShieldCheck, ShieldX, Ban, Lock } from 'lucide-react';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

interface UserBadgesProps {
  verified?: boolean;
  banned?: boolean;
  blocked?: boolean;
  className?: string;
}

export default function UserBadges({
  verified = false,
  banned = false,
  blocked = false,
  className = '',
}: UserBadgesProps) {
  if (!verified && !banned && !blocked) {
    return <UnverifiedBadge />;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {verified ? <VerifiedBadge /> : <UnverifiedBadge />}
      {banned && <BannedBadge />}
      {blocked && <BlockedBadge />}
    </div>
  );
}

// Individual badge components for specific use cases
export function VerifiedBadge() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <ShieldCheck className='h-5 w-5 text-green-600 cursor-pointer' />
      </TooltipTrigger>
      <TooltipContent>
        <p>Confirmed</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function UnverifiedBadge() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <ShieldX className='h-5 w-5 text-gray-400 cursor-pointer' />
      </TooltipTrigger>
      <TooltipContent>
        <p>Not Confirmed</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function BannedBadge() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Ban className='h-5 w-5 text-red-600 cursor-pointer' />
      </TooltipTrigger>
      <TooltipContent>
        <p>Banned</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function BlockedBadge() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Lock className='h-5 w-5 text-orange-600 cursor-pointer' />
      </TooltipTrigger>
      <TooltipContent>
        <p>Blocked</p>
      </TooltipContent>
    </Tooltip>
  );
}
