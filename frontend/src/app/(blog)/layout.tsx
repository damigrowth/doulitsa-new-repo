import { HeaderRelative } from '@/components/shared/layout';
import { getNavigationMenuData } from '@/actions/services/get-categories';

interface LayoutProps {
  children: React.ReactNode;
}

export default async function BlogLayout({ children }: LayoutProps) {
  const navDataResult = await getNavigationMenuData();
  const navigationData = navDataResult.success ? navDataResult.data : [];

  return (
    <>
      <HeaderRelative navigationData={navigationData} />
      {children}
    </>
  );
}
