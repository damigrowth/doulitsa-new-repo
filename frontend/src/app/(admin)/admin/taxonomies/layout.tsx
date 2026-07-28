import { requirePermission } from '@/actions/auth/server';
import { ADMIN_RESOURCES } from '@/lib/auth/roles';

export default async function TaxonomiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Require admin-only access for all taxonomy pages
  await requirePermission(ADMIN_RESOURCES.TAXONOMIES);

  return <>{children}</>;
}
