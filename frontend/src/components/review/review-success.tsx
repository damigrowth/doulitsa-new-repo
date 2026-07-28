'use client';

import { CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function ReviewSuccess() {
  return (
    <Card className='rounded-xl bg-white border-none shadow-none'>
      <CardContent className='p-8 md:p-12'>
        <div className='flex flex-col items-center text-center space-y-6'>
          {/* Success Icon - Theme color, slightly smaller */}
          <div className='rounded-full bg-third/10 p-3'>
            <CheckCircle className='h-8 w-8 text-third' />
          </div>

          {/* Title */}
          <h5 className='text-xl font-semibold'>
            Επιτυχής αποστολή αξιολόγησης!
          </h5>

          {/* Message - Simplified without review ID */}
          <div className='text-gray-600 space-y-2'>
            <p>Ευχαριστούμε για την αξιολόγηση σας</p>
            <p>
              Σύντομα θα γίνει η δημοσίευση της αφού ολοκληρωθεί η διαδικασία
              ελέγχου της.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
