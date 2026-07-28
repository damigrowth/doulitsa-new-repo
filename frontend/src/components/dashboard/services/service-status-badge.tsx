import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Status } from '@/lib/prisma-types';
import { StatusColors, StatusLabels } from '@/lib/types/common';

interface ServiceStatusBadgeProps {
  status: Status;
  className?: string;
}

export default function ServiceStatusBadge({
  status,
  className,
}: ServiceStatusBadgeProps) {
  const colors = StatusColors[status];
  const label = StatusLabels[status];

  // Map to badge variant
  const getVariant = () => {
    switch (status) {
      case Status.published:
      case Status.approved:
        return 'default' as const;
      case Status.rejected:
        return 'destructive' as const;
      case Status.pending:
        return 'default' as const;
      default:
        return 'secondary' as const;
    }
  };

  return (
    <Badge
      variant={getVariant()}
      className={cn(
        'font-medium text-xs rounded-full shadow-none',
        colors.bg,
        colors.text,
        `hover:${colors.bg}`,
        className,
      )}
    >
      {label}
    </Badge>
  );
}
