'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, ChevronRight } from 'lucide-react';
import { NextLink } from '@/components';

export function CreateServiceTaxonomyDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='default' size='md'>
          <Plus className='h-4 w-4' />
          Create Taxonomy
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Create Service Taxonomy</DialogTitle>
          <DialogDescription>
            Select the type of taxonomy you want to create.
          </DialogDescription>
        </DialogHeader>
        <div className='flex flex-col gap-2 py-4'>
          <Button variant='outline' className='justify-between h-12' asChild>
            <NextLink
              href='/admin/taxonomies/service/categories/create'
              onClick={() => setOpen(false)}
            >
              <span className='font-semibold'>Category</span>
              <ChevronRight className='h-4 w-4' />
            </NextLink>
          </Button>
          <Button variant='outline' className='justify-between h-12' asChild>
            <NextLink
              href='/admin/taxonomies/service/subcategories/create'
              onClick={() => setOpen(false)}
            >
              <span className='font-semibold'>Subcategory</span>
              <ChevronRight className='h-4 w-4' />
            </NextLink>
          </Button>
          <Button variant='outline' className='justify-between h-12' asChild>
            <NextLink
              href='/admin/taxonomies/service/subdivisions/create'
              onClick={() => setOpen(false)}
            >
              <span className='font-semibold'>Subdivision</span>
              <ChevronRight className='h-4 w-4' />
            </NextLink>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
