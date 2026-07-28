import { AdminGuard } from '@/components/guards';
import { AdminLayoutWrapper } from '@/components/admin/admin-layout-wrapper';
import { getFilteredNavItems } from '@/actions/admin/helpers';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch navigation items at the server layout level
  const { navItems } = await getFilteredNavItems();

  return (
    <AdminGuard>
      <AdminLayoutWrapper navItems={navItems}>{children}</AdminLayoutWrapper>
    </AdminGuard>
  );
}
