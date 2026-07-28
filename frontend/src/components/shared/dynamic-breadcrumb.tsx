import React from 'react';
import NextLink from '@/components/shared/next-link';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import BreadcrumbButtons from './breadcrumb-buttons';

export interface BreadcrumbSegment {
  label: string;
  href?: string;
  isCurrentPage?: boolean;
}

export interface DynamicBreadcrumbProps {
  segments: BreadcrumbSegment[];
  buttons?: {
    subjectTitle: string;
    id: string | number;
    savedStatus?: boolean;
    saveType?: string;
    hideSaveButton?: boolean;
    isAuthenticated?: boolean;
    isOwner?: boolean;
  };
  className?: string;
}

export default function DynamicBreadcrumb({
  segments,
  buttons,
  className = '',
}: DynamicBreadcrumbProps) {
  return (
    <section className={`py-4 ${className}`}>
      <div className='container mx-auto px-4'>
        <div className='flex items-center justify-between gap-4'>
          <div className='min-w-0 flex-1'>
            <Breadcrumb>
              <BreadcrumbList>
                {(segments ?? []).map((segment, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {segment.isCurrentPage ? (
                        <BreadcrumbPage>{segment.label}</BreadcrumbPage>
                      ) : segment.href ? (
                        <BreadcrumbLink asChild>
                          <NextLink href={segment.href}>
                            <span className='text-muted-foreground'>
                              {segment.label}
                            </span>
                          </NextLink>
                        </BreadcrumbLink>
                      ) : (
                        <span className='text-muted-foreground'>
                          {segment.label}
                        </span>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {buttons && (
            <div className='flex shrink-0 items-center justify-end'>
              <BreadcrumbButtons {...buttons} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
