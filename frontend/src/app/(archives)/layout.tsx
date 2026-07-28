import { HeaderRelative } from '@/components/shared/layout';
import { getNavigationMenuData } from '@/actions/services/get-categories';

interface LayoutProps {
  children: React.ReactNode;
}

export default async function StandardHeaderLayout({ children }: LayoutProps) {
  // Fetch navigation data at layout level (Server Component)
  const navDataResult = await getNavigationMenuData();
  const navigationData = navDataResult.success ? navDataResult.data : [];

  return (
    <>
      {/* Relative header for archive pages */}
      <HeaderRelative navigationData={navigationData} />
      {children}
    </>
  );
}