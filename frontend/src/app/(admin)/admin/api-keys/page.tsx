import { ApiKeyManagement } from '@/components/admin/api-key-management';

export const dynamic = 'force-dynamic';

export default function ApiKeysPage() {
  return (
    <div className='flex flex-col gap-6 py-4'>
      <div className='px-4 lg:px-6'>
        <ApiKeyManagement />
      </div>
    </div>
  );
}
