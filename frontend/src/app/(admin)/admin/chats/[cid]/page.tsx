import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';

import {
  getAdminChatDetailStats,
  getAdminChatById,
} from '@/actions/admin/chats';
import { AdminChatDetailStats } from '@/components/admin/admin-chat-detail-stats';
import { AdminChatMessagesFilters } from '@/components/admin/admin-chat-messages-filters';
import { AdminChatMessagesTableSection } from '@/components/admin/admin-chat-messages-table-section';
import { AdminChatMessagesTableSkeleton } from '@/components/admin/admin-chat-messages-table-skeleton';
import { SiteHeader } from '@/components/admin/site-header';

// Force dynamic rendering for admin pages
export const dynamic = 'force-dynamic';

interface ChatDetailPageProps {
  params: Promise<{ cid: string }>;
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    sort?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function ChatDetailPage({
  params,
  searchParams,
}: ChatDetailPageProps) {
  const { cid } = await params;
  const searchParamsData = await searchParams;

  // Verify chat exists
  const chat = await getAdminChatById(cid);

  if (!chat) {
    notFound();
  }

  // Fetch stats data
  const statsResult = await getAdminChatDetailStats(cid);
  const stats = statsResult.success ? statsResult.data : null;

  // Create stable key for Suspense based on data-fetching params only
  const tableKey = `${searchParamsData.page || '1'}-${searchParamsData.limit || '12'}-${searchParamsData.search || ''}-${searchParamsData.sort || ''}-${searchParamsData.sortBy || ''}-${searchParamsData.sortOrder || ''}`;

  return (
    <>
      <SiteHeader
        title='Chat Details'
        actions={
          <Button variant='ghost' asChild>
            <Link href='/admin/chats'>
              <ArrowLeft className='mr-2 h-4 w-4' />
              Back to Chats
            </Link>
          </Button>
        }
      />
      <div className='flex flex-col gap-6 py-4'>
        {/* Stats Cards */}
        <AdminChatDetailStats stats={stats} />

        {/* Filters */}
        <div className='px-4 lg:px-6'>
          <AdminChatMessagesFilters chatId={cid} />
        </div>

        {/* Messages Table */}
        <div className='px-4 lg:px-6'>
          <Suspense
            key={tableKey}
            fallback={<AdminChatMessagesTableSkeleton />}
          >
            <AdminChatMessagesTableSection
              chatId={cid}
              searchParams={searchParamsData}
            />
          </Suspense>
        </div>
      </div>
    </>
  );
}
