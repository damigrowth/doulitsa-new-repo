import crypto from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

import { revalidateAllCaches } from '@/actions/admin/revalidate-caches';

/**
 * Vercel Deploy Webhook
 *
 * Called automatically by Vercel after each successful deployment.
 * Revalidates all caches to ensure users see fresh content.
 *
 * Setup in Vercel Dashboard:
 * 1. Go to Project Settings → Webhooks
 * 2. Add endpoint: https://yourdomain.com/api/webhooks/revalidate-cache
 * 3. Select event: deployment.succeeded
 * 4. Copy the generated secret to REVALIDATE_CACHE_WEBHOOK_SECRET env variable
 */

/**
 * Verify Vercel webhook signature using HMAC SHA1
 * https://vercel.com/docs/observability/webhooks-overview/webhooks-api#securing-webhooks
 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha1', secret)
    .update(payload)
    .digest('hex');
  return signature === expectedSignature;
}

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.REVALIDATE_CACHE_WEBHOOK_SECRET;

    // Get raw payload for signature verification
    const payload = await request.text();

    // Verify the webhook signature
    if (!secret) {
      // Fail closed: without a configured secret anyone could purge all caches.
      console.error('[revalidate-cache] REVALIDATE_CACHE_WEBHOOK_SECRET not set — rejecting');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 401 });
    }
    if (secret) {
      const signature = request.headers.get('x-vercel-signature');

      if (!signature) {
        console.warn('[REVALIDATE_WEBHOOK] Missing x-vercel-signature header');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      if (!verifySignature(payload, signature, secret)) {
        console.warn('[REVALIDATE_WEBHOOK] Invalid signature');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Parse the webhook payload for logging
    let data: Record<string, unknown> | null = null;
    try {
      data = JSON.parse(payload);
    } catch {
      // Payload might be empty or invalid
    }

    console.log('[REVALIDATE_WEBHOOK] Deployment webhook received', {
      type: data?.type,
      deployment: data?.deployment,
    });

    // Only revalidate for production deployments
    // Vercel webhook payload: top-level `type` + `payload.deployment.target`
    const deploymentTarget =
      ((data?.payload as Record<string, unknown>)?.deployment as Record<string, unknown>)?.target ??
      (data?.deployment as Record<string, unknown>)?.target;
    if (data?.type === 'deployment.succeeded' && deploymentTarget === 'preview') {
      console.log('[REVALIDATE_WEBHOOK] Skipping preview deployment');
      return NextResponse.json({
        success: true,
        message: 'Skipped - preview deployment',
      });
    }

    // Revalidate all caches
    const result = await revalidateAllCaches();

    if (result.success) {
      console.log('[REVALIDATE_WEBHOOK] Cache revalidation successful');
      return NextResponse.json({
        success: true,
        message: result.message,
        revalidatedCount: result.revalidated?.length || 0,
      });
    } else {
      console.error('[REVALIDATE_WEBHOOK] Cache revalidation failed:', result.message);
      return NextResponse.json({ error: result.message }, { status: 500 });
    }
  } catch (error) {
    console.error('[REVALIDATE_WEBHOOK] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Also support GET for simple deploy hooks (uses query param secret)
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  const expectedSecret = process.env.REVALIDATE_CACHE_WEBHOOK_SECRET;

  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[REVALIDATE_WEBHOOK] Deploy hook triggered via GET');

  const result = await revalidateAllCaches();

  return NextResponse.json({
    success: result.success,
    message: result.message,
    revalidatedCount: result.revalidated?.length || 0,
  });
}
