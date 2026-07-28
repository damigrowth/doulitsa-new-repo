import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function AdminTaxonomySubmissionTableSkeleton() {
  return (
    <div className='rounded-md border'>
      <Table className='[&_th:first-child]:pl-4 [&_td:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:last-child]:pr-4'>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Label</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>By</TableHead>
            <TableHead>Date</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <TableRow key={i}>
              <TableCell className='px-4'>
                <Skeleton className='h-5 w-16' />
              </TableCell>
              <TableCell className='px-4'>
                <Skeleton className='h-4 w-32' />
              </TableCell>
              <TableCell className='px-4'>
                <Skeleton className='h-5 w-12' />
              </TableCell>
              <TableCell className='px-4'>
                <Skeleton className='h-4 w-20' />
              </TableCell>
              <TableCell className='px-4'>
                <div className='flex items-center gap-2'>
                  <Skeleton className='h-8 w-8 rounded-full' />
                  <Skeleton className='h-4 w-24' />
                </div>
              </TableCell>
              <TableCell className='px-4'>
                <Skeleton className='h-4 w-20' />
              </TableCell>
              <TableCell className='px-4'>
                <Skeleton className='h-8 w-16' />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
