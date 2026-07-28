/**
 * Client Component: Service Delete Form
 * Displays a red card with delete button and confirmation dialog
 * Used in both dashboard and admin service edit pages
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { ServiceDeleteDialog } from '@/components/services/service-delete-dialog';

interface FormServiceDeleteProps {
  service: {
    id: number;
    title: string;
  };
  isAdmin?: boolean;
  redirectPath?: string;
}

export function FormServiceDelete({
  service,
  isAdmin = false,
  redirectPath,
}: FormServiceDeleteProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <section className='pt-5'>
      <Button
        type='button'
        size='lg'
        variant='black'
        className='w-full sm:w-auto'
        onClick={() => setDeleteDialogOpen(true)}
      >
        Διαγραφή υπηρεσίας
      </Button>

      <ServiceDeleteDialog
        serviceId={service.id}
        serviceTitle={service.title}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        isAdmin={isAdmin}
        redirectPath={redirectPath}
      />
    </section>
  );
}
