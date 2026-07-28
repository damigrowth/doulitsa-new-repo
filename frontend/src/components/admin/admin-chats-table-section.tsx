import { getAdminChats } from '@/actions/admin/chats';
import { AdminChatsDataTable } from '@/components/admin/admin-chats-data-table';
import AdminTablePagination from '@/components/admin/admin-table-pagination';

interface AdminChatsTableSectionProps {
  searchParams: {
    page?: string;
    limit?: string;
    search?: string;
    sort?: string;
    sortBy?: string;
    sortOrder?: string;
  };
}

export async function AdminChatsTableSection({
  searchParams,
}: AdminChatsTableSectionProps) {
  // Parse search params
  const currentPage = parseInt(searchParams.page || '1');
  const limit = parseInt(searchParams.limit || '12');

  const result = await getAdminChats({
    search: searchParams.search,
    sort: searchParams.sort as 'newest' | 'oldest' | 'active' | undefined,
    sortBy: searchParams.sortBy,
    sortOrder: searchParams.sortOrder as 'asc' | 'desc' | undefined,
    page: currentPage,
    limit,
  });
  const data = result.success
    ? (result.data as { chats?: any[]; total?: number } | undefined)
    : undefined;
  const chats: any[] = data?.chats ?? [];
  const total: number = data?.total ?? 0;

  // Transform chats to match table structure
  const tableData = chats.map((chat) => {
    const members: any[] = chat.members ?? [];
    const creator = members.find((m) => m.id === chat.creatorUid);
    const member = members.find((m) => m.id !== chat.creatorUid);

    return {
      id: chat.id,
      cid: chat.cid,
      creator: creator || {
        id: '',
        displayName: null,
        username: null,
        image: null,
      },
      member: member || {
        id: '',
        displayName: null,
        username: null,
        image: null,
      },
      messageCount: chat.messageCount,
      createdAt: chat.createdAt,
      lastActivity: chat.lastActivity,
    };
  });

  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <AdminChatsDataTable data={tableData} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className='mt-6'>
          <AdminTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            currentLimit={limit}
            basePath='/admin/chats'
          />
        </div>
      )}
    </>
  );
}
