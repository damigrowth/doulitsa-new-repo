'use server';

import * as blogApi from '@/lib/api/blog';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';
import type { BlogArticleCard, BlogArticlesResponse } from '@/lib/types/blog';

export async function getArticles(query: {
  page?: number;
  limit?: number;
  categorySlug?: string;
  authorProfileId?: string;
  featured?: boolean;
  search?: string;
} = {}): Promise<ActionResult<BlogArticlesResponse>> {
  try {
    return { success: true, data: (await blogApi.listArticles(query)) as BlogArticlesResponse };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function getRelatedArticles(
  categorySlug: string,
  excludeSlug: string,
  limit = 4,
): Promise<ActionResult<BlogArticleCard[]>> {
  try {
    return { success: true, data: (await blogApi.getRelatedArticles(excludeSlug, limit)) as BlogArticleCard[] };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
