'use server';

import { cookies } from 'next/headers';
import type { ActionResult } from '@/lib/types/api';

interface OAuthIntent {
  type: 'user' | 'pro';
  role?: 'freelancer' | 'company';
}

/**
 * Store OAuth registration intent in a secure, httpOnly cookie on the
 * FRONTEND domain (mirrors OLD store-oauth-intent.ts). It must live here —
 * not on the Django domain — because the Google OAuth callback route
 * (/api/auth/callback/google) reads it from the browser's request to this
 * app and relays it to Django's exchange endpoint.
 */
export async function storeOAuthIntent(
  intent: OAuthIntent,
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const cookieStore = await cookies();

    // Store as httpOnly, secure cookie that expires in 10 minutes
    cookieStore.set('oauth_intent', JSON.stringify(intent), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });

    return {
      success: true,
      data: { success: true },
    };
  } catch (error) {
    console.error('Error storing OAuth intent:', error);
    return {
      success: false,
      error: 'Failed to store OAuth intent',
    };
  }
}

/**
 * Retrieve and clear OAuth registration intent from cookie
 */
export async function getOAuthIntent(): Promise<ActionResult<OAuthIntent | null>> {
  try {
    const cookieStore = await cookies();
    const intentCookie = cookieStore.get('oauth_intent');

    if (!intentCookie?.value) {
      return {
        success: true,
        data: null,
      };
    }

    const intent = JSON.parse(intentCookie.value) as OAuthIntent;

    // Clear the cookie after reading
    cookieStore.delete('oauth_intent');

    return {
      success: true,
      data: intent,
    };
  } catch (error) {
    console.error('Error retrieving OAuth intent:', error);
    return {
      success: false,
      error: 'Failed to retrieve OAuth intent',
    };
  }
}
