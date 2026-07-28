'use client';

import { Button } from '@/components/ui/button';

export default function DocumentsInterface() {
  return (
    <div className='space-y-6'>
      <div className='space-y-4'>
        <h3 className='text-lg font-medium'>Παραστατικά</h3>
        <p className='text-sm text-muted-foreground'>
          Προβάλετε και διαχειριστείτε τα παραστατικά σας
        </p>
      </div>

      {/* Documents list and management will be added here */}
      <div className='bg-muted/50 p-4 rounded-lg'>
        <p className='text-sm text-muted-foreground'>
          Η διεπαφή διαχείρισης παραστατικών θα προστεθεί εδώ
        </p>
      </div>

      <div className='flex justify-end space-x-4'>
        <Button variant='outline' type='button'>
          Εξαγωγή
        </Button>
        <Button type='button'>Δημιουργία Παραστατικού</Button>
      </div>
    </div>
  );
}
