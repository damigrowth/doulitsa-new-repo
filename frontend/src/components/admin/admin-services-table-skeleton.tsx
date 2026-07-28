import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function AdminServicesTableSkeleton() {
  return (
    <div className='rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Service</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <TableRow key={i}>
              <TableCell className='px-4'>
                <div className='flex items-center gap-3'>
                  <Skeleton className='h-10 w-10 rounded' />
                  <div className='space-y-2'>
                    <Skeleton className='h-4 w-32' />
                    <Skeleton className='h-3 w-24' />
                  </div>
                </div>
              </TableCell>
              <TableCell className='px-4'>
                <Skeleton className='h-6 w-24' />
              </TableCell>
              <TableCell className='px-4'>
                <Skeleton className='h-6 w-16' />
              </TableCell>
              <TableCell className='px-4'>
                <div className='flex items-center gap-2'>
                  <Skeleton className='h-5 w-5 rounded' />
                  <Skeleton className='h-5 w-5 rounded' />
                </div>
              </TableCell>
              <TableCell className='px-4'>
                <div className='space-y-1'>
                  <Skeleton className='h-4 w-20' />
                  <Skeleton className='h-3 w-16' />
                </div>
              </TableCell>
              <TableCell className='px-4'>
                <div className='space-y-1'>
                  <Skeleton className='h-4 w-20' />
                  <Skeleton className='h-3 w-16' />
                </div>
              </TableCell>
              <TableCell className='px-4'>
                <div className='space-y-1'>
                  <Skeleton className='h-4 w-20' />
                  <Skeleton className='h-3 w-16' />
                </div>
              </TableCell>
              <TableCell className='px-4'>
                <Skeleton className='h-8 w-8 rounded' />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
