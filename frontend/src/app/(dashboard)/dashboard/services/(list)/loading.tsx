import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export default function ServicesLoading() {
  return (
    <div className="space-y-6 p-2 pr-0">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-96 mt-1" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Services Table Card */}
      <Card>
        <CardContent className="p-6">
          {/* Table Header with Stats */}
          <div className="space-y-4 mb-6">
            {/* Title and Stats Row */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />

              {/* Status Indicators */}
              <div className="flex items-center gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="w-2 h-2 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-6" />
                  </div>
                ))}
              </div>
            </div>

            {/* Search and Sort Filters */}
            <div className="border-t pt-4">
              <div className="flex flex-col md:flex-row gap-4">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-48" />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="space-y-3">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 pb-3 border-b">
              <Skeleton className="h-4 w-32 col-span-4" />
              <Skeleton className="h-4 w-20 col-span-2" />
              <Skeleton className="h-4 w-24 col-span-2" />
              <Skeleton className="h-4 w-24 col-span-2" />
              <Skeleton className="h-4 w-20 col-span-2" />
            </div>

            {/* Table Rows */}
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="grid grid-cols-12 gap-4 py-4 border-b">
                <div className="col-span-4 space-y-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="col-span-2 flex items-center">
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <div className="col-span-2 flex items-center">
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="col-span-2 flex items-center">
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-10 w-10" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
