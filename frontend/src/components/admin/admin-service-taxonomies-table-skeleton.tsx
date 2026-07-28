import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function AdminServiceTaxonomiesTableSkeleton() {
  return (
    <div className='space-y-4'>
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[50px]'>
                <Skeleton className='h-4 w-4' />
              </TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Featured</TableHead>
              <TableHead className='w-[100px]'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className='h-4 w-4' />
                </TableCell>
                <TableCell>
                  <Skeleton className='h-4 w-32' />
                </TableCell>
                <TableCell>
                  <Skeleton className='h-4 w-24' />
                </TableCell>
                <TableCell>
                  <Skeleton className='h-6 w-20' />
                </TableCell>
                <TableCell>
                  <Skeleton className='h-4 w-28' />
                </TableCell>
                <TableCell>
                  <Skeleton className='h-6 w-16' />
                </TableCell>
                <TableCell>
                  <Skeleton className='h-8 w-8' />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className='flex items-center justify-between'>
        <Skeleton className='h-4 w-32' />
        <div className='flex items-center gap-2'>
          <Skeleton className='h-8 w-8' />
          <Skeleton className='h-8 w-8' />
          <Skeleton className='h-8 w-8' />
          <Skeleton className='h-8 w-8' />
        </div>
      </div>
    </div>
  );
}
