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

import BreadcrumbButtons from '../shared/breadcrumb-buttons';
import { ProfileBreadcrumbProps } from '@/lib/types';

export default function ProfileBreadcrumb({
  profile,
  category,
  subcategory,
}: ProfileBreadcrumbProps) {
  const parentSlug = profile.role === 'company' ? 'companies' : 'pros';

  return (
    <section className='py-4'>
      <div className='container mx-auto px-4'>
        <div className='flex items-center justify-between gap-4'>
          <div className='min-w-0 flex-1'>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <NextLink href={`/${parentSlug}`}>
                      <span className='text-muted-foreground'>
                        {profile.role === 'company'
                          ? 'Επιχειρήσεις'
                          : 'Επαγγελματίες'}
                      </span>
                    </NextLink>
                  </BreadcrumbLink>
                </BreadcrumbItem>

                {category && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <NextLink href={`/${parentSlug}/${category.slug}`}>
                          <span className='text-muted-foreground'>
                            {category.plural || category.label}
                          </span>
                        </NextLink>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  </>
                )}

                {subcategory && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>
                        {subcategory.plural || subcategory.label}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className='flex shrink-0 items-center justify-end'>
            <BreadcrumbButtons
              subjectTitle={profile.displayName}
              id={profile.id}
              saveType='profile'
            />
          </div>
        </div>
      </div>
    </section>
  );
}
