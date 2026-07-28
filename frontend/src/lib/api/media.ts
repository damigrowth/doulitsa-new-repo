/**
 * Media API — Cloudinary helpers only.
 *
 * Uploads do NOT go through Django: the browser uploads directly to Cloudinary
 * with unsigned presets (`doulitsa_new`, `doulitsa_profile_images`) via the
 * upload widget. This module only exposes the signing token used by the admin
 * Cloudinary Media Library, plus the (compatibility) param-signing helper.
 */

import { api } from './client';

export interface MediaResource {
  id?: string;
  asset_id?: string;
  public_id: string;
  secure_url: string;
  url: string;
  version?: number;
  format?: string | null;
  width?: number | null;
  height?: number | null;
  resource_type: 'image' | 'video' | 'raw';
  bytes?: number | null;
  original_filename?: string | null;
  created_at?: string | null;
  tags?: string[];
  context?: Record<string, unknown>;
  type?: string;
  signature?: string;
}

export type UsageContext =
  | 'profile_avatar'
  | 'profile_portfolio'
  | 'service_image'
  | 'blog_cover'
  | 'general';

// ---- Cloudinary signing helpers -----------------------------------------

export const signCloudinaryParams = (paramsToSign: Record<string, unknown>) =>
  api.post<{ signature: string }>('/sign-cloudinary-params', { paramsToSign });

export const getMediaLibraryToken = () =>
  api.post<{ signature: string; timestamp: number; apiKey: string; cloudName: string }>(
    '/admin/media/cloudinary/media-library-token',
  );
