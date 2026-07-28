'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  UserPlus,
  UserCheck,
  Briefcase,
  Tag,
  FileText,
  Plus,
  FolderTree,
  Target,
  Layers,
  BookmarkIcon,
} from 'lucide-react';
import { NextLink } from '@/components';

interface QuickCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const createLinks = [
  {
    title: 'Service Category',
    description: 'Create a service category',
    href: '/admin/taxonomies/service/categories/create',
    icon: Tag,
  },
  {
    title: 'Service Subcategory',
    description: 'Create a service subcategory',
    href: '/admin/taxonomies/service/subcategories/create',
    icon: FolderTree,
  },
  {
    title: 'Service Subdivision',
    description: 'Create a service subdivision',
    href: '/admin/taxonomies/service/subdivisions/create',
    icon: Layers,
  },
  {
    title: 'Pro Category',
    description: 'Create a pro category',
    href: '/admin/taxonomies/pro/categories/create',
    icon: Target,
  },
  {
    title: 'Pro Subcategory',
    description: 'Create a pro subcategory',
    href: '/admin/taxonomies/pro/subcategories/create',
    icon: FolderTree,
  },
  {
    title: 'Skill',
    description: 'Create a new skill',
    href: '/admin/taxonomies/skills/create',
    icon: BookmarkIcon,
  },
  {
    title: 'Tag',
    description: 'Create a new tag',
    href: '/admin/taxonomies/tags/create',
    icon: Tag,
  },
];

export function QuickCreateDialog({
  open,
  onOpenChange,
}: QuickCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Plus className='h-5 w-5' />
            Quick Create
          </DialogTitle>
          <DialogDescription>
            Choose what you'd like to create
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-3 py-4'>
          {createLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NextLink
                key={link.href}
                href={link.href}
                onClick={() => onOpenChange(false)}
              >
                <Button
                  variant='outline'
                  className='h-auto w-full justify-start p-4'
                >
                  <div className='flex items-start gap-4'>
                    <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10'>
                      <Icon className='h-5 w-5 text-primary' />
                    </div>
                    <div className='flex flex-col items-start gap-1 text-left'>
                      <span className='font-semibold'>{link.title}</span>
                      <span className='text-sm text-muted-foreground'>
                        {link.description}
                      </span>
                    </div>
                  </div>
                </Button>
              </NextLink>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
