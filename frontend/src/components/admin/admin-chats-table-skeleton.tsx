import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function AdminChatsTableSkeleton() {
  return (
    <div className='space-y-4'>
      {/* Table */}
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[100px]'>ID</TableHead>
              <TableHead>Creator</TableHead>
              <TableHead>Member</TableHead>
              <TableHead className='w-[100px]'>Messages</TableHead>
              <TableHead className='w-[150px]'>Created</TableHead>
              <TableHead className='w-[150px]'>Last Activity</TableHead>
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

                {/* Creator Column */}
                <TableCell>
                  <div className='flex items-center gap-3'>
                    <Skeleton className='h-8 w-8 rounded-full' />
                    <div className='space-y-1'>
                      <Skeleton className='h-4 w-24' />
                      <Skeleton className='h-3 w-20' />
                    </div>
                  </div>
                </TableCell>

                {/* Member Column */}
                <TableCell>
                  <div className='flex items-center gap-3'>
                    <Skeleton className='h-8 w-8 rounded-full' />
                    <div className='space-y-1'>
                      <Skeleton className='h-4 w-24' />
                      <Skeleton className='h-3 w-20' />
                    </div>
                  </div>
                </TableCell>

                {/* Messages Column */}
                <TableCell>
                  <Skeleton className='h-4 w-8' />
                </TableCell>

                {/* Created Column */}
                <TableCell>
                  <Skeleton className='h-4 w-28' />
                </TableCell>

                {/* Last Activity Column */}
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
