'use server';

import * as blogApi from '@/lib/api/blog';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';
import type { BlogArticleDetail } from '@/lib/types/blog';

export async function getArticle(slug: string): Promise<ActionResult<BlogArticleDetail | null>> {
  try {
    return { success: true, data: (await blogApi.getArticle(slug)) as BlogArticleDetail | null };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return { success: true, data: null };
    }
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
