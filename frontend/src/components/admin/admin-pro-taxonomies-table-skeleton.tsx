import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function AdminProTaxonomiesTableSkeleton() {
  return (
    <div className='space-y-4'>
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[50px]'>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead className='text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className='h-4 w-8' />
                </TableCell>
                <TableCell>
                  <Skeleton className='h-4 w-[180px]' />
                </TableCell>
                <TableCell>
                  <Skeleton className='h-4 w-[150px]' />
                </TableCell>
                <TableCell>
                  <Skeleton className='h-5 w-[90px]' />
                </TableCell>
                <TableCell>
                  <Skeleton className='h-5 w-[80px]' />
                </TableCell>
                <TableCell>
                  <Skeleton className='h-4 w-[120px]' />
                </TableCell>
                <TableCell className='text-right'>
                  <Skeleton className='ml-auto h-8 w-8' />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className='flex items-center justify-between'>
        <Skeleton className='h-4 w-[200px]' />
        <Skeleton className='h-10 w-[300px]' />
      </div>
    </div>
  );
}
