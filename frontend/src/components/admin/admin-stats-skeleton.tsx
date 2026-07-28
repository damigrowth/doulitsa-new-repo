import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AdminStatsSkeleton() {
  return (
    <>
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              <div className='h-4 w-24 bg-muted animate-pulse rounded' />
            </CardTitle>
            <div className='h-4 w-4 bg-muted animate-pulse rounded' />
          </CardHeader>
          <CardContent>
            <div className='h-8 w-16 bg-muted animate-pulse rounded' />
            <div className='h-3 w-32 bg-muted animate-pulse rounded mt-1' />
          </CardContent>
        </Card>
      ))}
    </>
  );
}
