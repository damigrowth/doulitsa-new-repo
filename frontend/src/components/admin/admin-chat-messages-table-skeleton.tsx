import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function AdminChatMessagesTableSkeleton() {
  return (
    <div className='space-y-4'>
      {/* Table */}
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[100px]'>ID</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Content</TableHead>
              <TableHead className='w-[150px]'>Created</TableHead>
              <TableHead className='w-[80px]'></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 12 }).map((_, index) => (
              <TableRow key={index}>
                {/* ID Column */}
                <TableCell>
                  <Skeleton className='h-4 w-16 font-mono' />
                </TableCell>

                {/* Author Column */}
                <TableCell>
                  <div className='flex items-center gap-3'>
                    <Skeleton className='h-8 w-8 rounded-full' />
                    <div className='space-y-1'>
                      <Skeleton className='h-4 w-24' />
                      <Skeleton className='h-3 w-20' />
                    </div>
                  </div>
                </TableCell>

                {/* Content Column */}
                <TableCell>
                  <div className='max-w-md'>
                    <Skeleton className='h-4 w-full' />
                  </div>
                </TableCell>

                {/* Created Column */}
                <TableCell>
                  <Skeleton className='h-4 w-28' />
                </TableCell>

                {/* Actions Column */}
                <TableCell>
                  <Skeleton className='h-8 w-8 rounded' />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
