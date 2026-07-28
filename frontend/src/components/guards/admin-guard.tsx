import { redirect } from 'next/navigation';
import { requireAnyRole } from '@/actions/auth/server';

interface AdminGuardProps {
  children: React.ReactNode;
}

export async function AdminGuard({ children }: AdminGuardProps) {
  // Server-side admin role check - allow admin, support, and editor roles
  try {
    await requireAnyRole(['admin', 'support', 'editor']);

    // User is authenticated with admin role - render children directly
    return <>{children}</>;
  } catch (error) {
    // requireAnyRole should handle redirects, but catch any other errors
    redirect('/login');
  }
}
