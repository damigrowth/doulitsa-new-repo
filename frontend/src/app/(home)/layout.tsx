import { HeaderFixed } from '@/components/shared/layout';
import { getNavigationMenuData } from '@/actions/services/get-categories';

interface LayoutProps {
  children: React.ReactNode;
}

export default async function StickyHeaderLayout({ children }: LayoutProps) {
  // Fetch navigation data at layout level (Server Component)
  const navDataResult = await getNavigationMenuData();
  const navigationData = navDataResult.success ? navDataResult.data : [];

  return (
    <>
      {/* Fixed header for homepage */}
      <HeaderFixed navigationData={navigationData} />
      {/* Spacer to compensate for fixed header */}
      <div className="h-16 md:h-20" />
      {children}
    </>
  );
}