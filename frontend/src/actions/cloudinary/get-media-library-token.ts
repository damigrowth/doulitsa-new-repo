'use server';

import * as mediaApi from '@/lib/api/media';
import { ApiError } from '@/lib/api/client';

interface MediaLibraryTokenResult {
  success: boolean;
  data?: { signature: string; timestamp: number; apiKey: string; cloudName: string };
  error?: string;
}

export async function getMediaLibraryToken(): Promise<MediaLibraryTokenResult> {
  try {
    const res = await mediaApi.getMediaLibraryToken();
    return { success: true, data: res };
  } catch (err) {
    return {
      success: false,
      error: err instanceof ApiError ? err.message : 'Failed to generate authentication token',
    };
  }
}
