import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader for ProfileSkills component (Sidebar)
 * Matches the skills card with speciality and regular skills
 */
export default function ProfileSkillsSkeleton() {
  return (
    <Card className='rounded-lg border border-border bg-muted'>
      <CardHeader className='pb-6'>
        <Skeleton className='h-6 w-24' />
      </CardHeader>
      <CardContent>
        <div className='flex flex-wrap gap-1'>
          {/* Speciality badge (highlighted) */}
          <Skeleton className='h-9 w-28 rounded-xl mb-1.5 mr-1.5' />

          {/* Regular skill badges */}
          <Skeleton className='h-9 w-24 rounded-xl mb-1.5 mr-1.5' />
          <Skeleton className='h-9 w-20 rounded-xl mb-1.5 mr-1.5' />
          <Skeleton className='h-9 w-32 rounded-xl mb-1.5 mr-1.5' />
          <Skeleton className='h-9 w-22 rounded-xl mb-1.5 mr-1.5' />
          <Skeleton className='h-9 w-26 rounded-xl mb-1.5 mr-1.5' />
          <Skeleton className='h-9 w-24 rounded-xl mb-1.5 mr-1.5' />
          <Skeleton className='h-9 w-28 rounded-xl mb-1.5 mr-1.5' />
          <Skeleton className='h-9 w-20 rounded-xl mb-1.5 mr-1.5' />
        </div>
      </CardContent>
    </Card>
  );
}
