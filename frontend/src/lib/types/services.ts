/**
 * SERVICE TYPE DEFINITIONS
 * All service-related types including database models and API responses
 */

import type { Profile, Service, User } from '@/lib/prisma-types';
import type { ServiceCardData } from './components';

// Service with the profile relation the Django service payload embeds.
export type ServiceWithProfile = Service & {
  profile: Pick<
    Profile,
    | 'id'
    | 'uid'
    | 'username'
    | 'displayName'
    | 'rating'
    | 'reviewCount'
    | 'verified'
    | 'image'
    | 'portfolio'
    | 'coverage'
  > & {
    firstName: string | null;
    lastName: string | null;
  };
};


// Service pagination response
export type ServicePaginationResponse = {
  services: ServiceCardData[];
  total: number;
  hasMore: boolean;
};

// Service filter options
export interface ServiceFilterOptions {
  page?: number;
  limit?: number;
  category?: string;
  excludeFeatured?: boolean;
  search?: string;
}

// User service table specific types
export interface UserServiceFilterOptions {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  subcategory?: string;
  search?: string;
  sortBy?: 'title' | 'createdAt' | 'updatedAt' | 'status' | 'category';
  sortOrder?: 'asc' | 'desc';
}

export interface UserServiceTableData {
  id: number;
  slug: string;
  title: string;
  status: string;
  category: string;
  subcategory: string;
  subdivision: string;
  taxonomyLabels: {
    category: string;
    subcategory: string;
    subdivision: string;
  };
  media: any;
  createdAt: Date;
  updatedAt: Date;
  refreshedAt: Date | null;
  sortDate: Date;
  featured: boolean;
}

export interface UserServicesResponse {
  services: UserServiceTableData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  canFeatureMore: boolean;
  canCreateMore: boolean;
}

// Service status types
export type ServiceStatus = 'draft' | 'pending' | 'published' | 'rejected';

// Service sorting options
export type ServiceSortField = 'title' | 'createdAt' | 'updatedAt' | 'status' | 'category';
export type SortOrder = 'asc' | 'desc';

// Service stats for dashboard
export interface UserServiceStats {
  total: number;
  draft: number;
  pending: number;
  published: number;
  rejected: number;
}

// Admin services table type with all necessary relations (Django admin payload).
export type AdminServiceWithRelations = Service & {
  profile: Pick<Profile, 'id' | 'displayName' | 'username' | 'image'> & {
    user: Pick<User, 'email' | 'name' | 'role'>;
  };
  _count: { reviews: number };
  taxonomyLabels?: {
    category: string;
    subcategory: string;
    subdivision: string;
  };
};