'use server';

import { adminBlog } from '@/lib/api/admin';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';
import { revalidatePublicBlog } from '@/lib/cache/revalidation';

const wrap = async <T>(fn: () => Promise<T>): Promise<ActionResult<T>> => {
  try { return { success: true, data: await fn() }; }
  catch (err) { return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' }; }
};

export interface CreateArticleInput {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  coverImage?: unknown;
  categorySlug?: string;
  status?: 'draft' | 'pending' | 'published' | 'rejected';
  featured?: boolean;
  authors?: string[];
}

export interface UpdateArticleInput extends Partial<CreateArticleInput> {
  id: string;
}

export async function createArticle(input: CreateArticleInput): Promise<ActionResult<{ id: string; slug: string }>> {
  const res = await wrap(() => adminBlog.create(input) as Promise<{ id: string; slug: string }>);
  if (res.success) await revalidatePublicBlog(res.data?.slug);
  return res;
}

export async function updateArticle(input: UpdateArticleInput): Promise<ActionResult<{ id: string; slug: string }>> {
  const { id, ...rest } = input;
  const res = await wrap(() => adminBlog.update(id, rest) as Promise<{ id: string; slug: string }>);
  if (res.success) await revalidatePublicBlog(res.data?.slug);
  return res;
}

export async function deleteArticle(id: string): Promise<ActionResult<void>> {
  const res = await wrap(async () => { await adminBlog.delete(id); });
  if (res.success) await revalidatePublicBlog();
  return res;
}

export async function listArticlesAdmin(params: {
  page?: number;
  limit?: number;
  status?: string;
  categorySlug?: string;
  search?: string;
} = {}) {
  return wrap(() => adminBlog.list(params));
}

export async function getArticleAdmin(id: string) {
  return wrap(() => adminBlog.get(id));
}
