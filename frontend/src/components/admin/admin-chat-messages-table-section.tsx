import { getAdminChatMessages } from '@/actions/admin/chats';
import { AdminChatMessagesDataTable } from '@/components/admin/admin-chat-messages-data-table';
import AdminTablePagination from '@/components/admin/admin-table-pagination';

interface AdminChatMessagesTableSectionProps {
  chatId: string;
  searchParams: {
    page?: string;
    limit?: string;
    search?: string;
    sort?: string;
    sortBy?: string;
    sortOrder?: string;
  };
}

export async function AdminChatMessagesTableSection({
  chatId,
  searchParams,
}: AdminChatMessagesTableSectionProps) {
  // Parse search params
  const currentPage = parseInt(searchParams.page || '1');
  const limit = parseInt(searchParams.limit || '12');

  // Determine sorting
  let sortBy = searchParams.sortBy;
  let sortOrder = searchParams.sortOrder as 'asc' | 'desc' | undefined;

  // Map filter dropdown sort to table sorting
  if (!sortBy && searchParams.sort) {
    sortBy = 'createdAt';
    sortOrder = searchParams.sort === 'oldest' ? 'asc' : 'desc';
  }

  const result = await getAdminChatMessages(chatId, {
    search: searchParams.search,
    sortBy,
    sortOrder,
    page: currentPage,
    limit,
  });

  const messages = result.success && result.data ? result.data.messages : [];
  const total = result.success && result.data ? result.data.total : 0;

  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <AdminChatMessagesDataTable data={messages} chatId={chatId} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className='mt-6'>
          <AdminTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            currentLimit={limit}
            basePath={`/admin/chats/${chatId}`}
          />
        </div>
      )}
    </>
  );
}
