import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function AdminSubscriptionsTableSkeleton() {
  return (
    <div className='rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Προφίλ</TableHead>
            <TableHead>Κατάσταση</TableHead>
            <TableHead>Πλάνο</TableHead>
            <TableHead>Δημιουργία</TableHead>
            <TableHead>Λήγει</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className='h-4 w-16' />
              </TableCell>
              <TableCell>
                <div className='flex items-center gap-2'>
                  <Skeleton className='h-8 w-8 rounded-full' />
                  <div className='space-y-1'>
                    <Skeleton className='h-4 w-32' />
                    <Skeleton className='h-3 w-40' />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className='h-6 w-20' />
              </TableCell>
              <TableCell>
                <Skeleton className='h-6 w-20' />
              </TableCell>
              <TableCell>
                <Skeleton className='h-4 w-24' />
              </TableCell>
              <TableCell>
                <div className='space-y-1'>
                  <Skeleton className='h-4 w-20' />
                  <Skeleton className='h-3 w-12' />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
