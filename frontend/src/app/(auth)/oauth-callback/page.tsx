import { getSession } from '@/actions/auth/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * OAuth Callback Handler Page
 *
 * This page handles the redirect after successful OAuth authentication.
 * It determines the appropriate dashboard based on the user's role:
 * - Admin roles (admin, support, editor) -> /admin
 * - Other roles -> /dashboard
 *
 * This ensures that admin users are redirected to the admin panel
 * after OAuth login while still allowing them to access /dashboard manually.
 */
export default async function OAuthCallbackPage() {
  // Get the current session
  const sessionResult = await getSession({ revalidate: true });

  if (!sessionResult.success || !sessionResult.data.user) {
    // No session, redirect to login
    redirect('/login');
  }

  const user = sessionResult.data.user;

  // Handle different user states
  if (!user.emailVerified) {
    redirect('/register/success');
  } else if (user.step === 'TYPE_SELECTION') {
    // Users from /login OAuth flow need to select their account type
    redirect('/oauth-setup');
  } else if (user.step === 'ONBOARDING') {
    redirect('/onboarding');
  } else if (user.step === 'OAUTH_SETUP') {
    // Users from /register OAuth flow need to complete setup
    redirect('/oauth-setup');
  } else if (user.step === 'DASHBOARD') {
    // Check if user has admin role and redirect accordingly
    if (user.role === 'admin' || user.role === 'support' || user.role === 'editor') {
      redirect('/admin');
    } else {
      redirect('/dashboard');
    }
  } else {
    // Default redirect
    redirect('/dashboard');
  }
}