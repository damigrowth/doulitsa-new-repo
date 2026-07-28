/**
 * COMPONENT TYPE DEFINITIONS
 * All component prop and interface types
 */

import type { Profile, Service, User } from '@/lib/prisma-types';
import { DatasetItem } from './datasets';

// Navigation and Menu types
export interface MenuItem {
  id: number;
  name: string;
  path: string;
  icon?: string;
  children?: MenuItem[];
}

export interface NavigationItem {
  id: number;
  name: string;
  path?: string;
  children?: NavigationItem[];
}

export interface UserMenuProps {
  isMobile?: boolean;
}

export interface UserMenuLinkProps {
  item: MenuItem;
}

// Header Navigation Menu types (taxonomy-based)
export interface NavigationMenuSubdivision {
  id: string;
  label: string;
  slug: string;
  count: number;
  href: string;
}

export interface NavigationMenuSubcategory {
  id: string;
  label: string;
  slug: string;
  count: number;
  href: string;
  topSubdivisions: NavigationMenuSubdivision[]; // Top 3 by count
  totalSubdivisions: number;
  hasMoreSubdivisions: boolean; // For "Προβολή όλων" button
}

export interface NavigationMenuCategory {
  id: string;
  label: string;
  slug: string;
  icon?: string;
  href: string;
  subcategories: NavigationMenuSubcategory[]; // Top 6 for mega menu display
  totalSubcategories: number;
  hasMoreSubcategories: boolean; // For "Προβολή όλων των Υποκατηγοριών" button
}

// Media Upload Components
export interface MediaUploadProps {
  value:
    | import('./cloudinary').CloudinaryResource
    | import('./cloudinary').CloudinaryResource[]
    | string
    | null;
  onChange: (
    resources:
      | import('./cloudinary').CloudinaryResource
      | import('./cloudinary').CloudinaryResource[]
      | string
      | null,
  ) => void;
  uploadPreset?: string;
  multiple?: boolean;
  folder?: string;
  maxFiles?: number;
  maxFileSize?: number;
  allowedFormats?: string[];
  className?: string;
  placeholder?: string;
  error?:
    | string
    | import('react-hook-form').FieldError
    | import('react-hook-form').Merge<
        import('react-hook-form').FieldError,
        import('react-hook-form').FieldErrorsImpl<any>
      >;
  type?: 'image' | 'auto';
  signed?: boolean;
  signatureEndpoint?: string;
}

export interface MediaUploadRef {
  uploadFiles: () => Promise<boolean>;
  hasFiles: () => boolean;
  clearQueue: () => void;
}

export interface ProfileImageUploadProps {
  resource:
    | import('../utils/media').CloudinaryResourceOrPending
    | string
    | null;
  queuedFile: import('../utils/media').QueuedFile | null;
  onFileSelect: (files: FileList) => void;
  onRemove: () => void;
  isUploading: boolean;
  error: string | null;
  maxFileSize: number;
  formats: string[];
  className?: string;
  // Widget mode props
  useWidget?: boolean;
  folder?: string;
  uploadPreset?: string;
  signed?: boolean;
  signatureEndpoint?: string;
  onDirectUpload?: (resource: import('./cloudinary').CloudinaryResource) => void;
}

export interface GalleryUploadProps {
  resources: import('../utils/media').CloudinaryResourceOrPending[];
  queuedFiles: import('../utils/media').QueuedFile[];
  onFilesSelected: (files: FileList) => void;
  onRemoveResource: (publicId: string) => void;
  onRemoveFromQueue: (fileId: string) => void;
  onReorderResources: (
    resources: import('../utils/media').CloudinaryResourceOrPending[],
  ) => void;
  isUploading: boolean;
  error: string | null;
  maxFiles: number;
  maxFileSize: number;
  formats: string[];
  canAddMore: boolean;
  className?: string;
  type: 'image' | 'auto';
}

export interface ResourcePreviewProps {
  resource: import('../utils/media').CloudinaryResourceOrPending;
  index: number;
  onRemove: (publicId: string) => void;
  isDragging?: boolean;
  dragHandleProps?: any;
  width?: number;
  height?: number;
}

export interface ProfileInfoProps {
  rate?: number;
  coverage?: AppJson.Coverage;
  commencement?: string;
  experience?: number;
  website?: string;
  phone?: string;
  viber?: string;
  whatsapp?: string;
  email?: string;
  visibility?: AppJson.VisibilitySettings;
  profileUserId?: string;
  profileDisplayName?: string;
}

// Profile meta component props
export interface ProfileMetaProps {
  displayName: string;
  firstName?: string;
  lastName?: string;
  tagline?: string;
  image?: AppJson.CloudinaryResource | string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  top?: boolean;
  coverage?: AppJson.Coverage;
  visibility?: AppJson.VisibilitySettings;
  socials?: AppJson.SocialMedia;
  subcategory?: DatasetItem;
}

export interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value?: string | number;
  isFullWidth?: boolean;
}

// Profile metrics component props
export interface ProfileMetricsProps {
  category?: DatasetItem;
  subcategory?: DatasetItem;
  serviceSubdivisions?: DatasetItem[];
  coverage?: AppJson.Coverage;
}

export interface ProfileRatingProps {
  totalReviews: number;
  rating: number;
  clickable?: boolean;
}

// Skills component props
export interface ProfileSkillsProps {
  skills: DatasetItem[]; // Array of skill IDs
  speciality?: string; // Speciality ID
}

// Features component props
export interface ProfileFeaturesProps {
  contactMethods?: string[];
  paymentMethods?: string[];
  settlementMethods?: string[];
  size?: string;
  budget?: string;
  // Resolved data from taxonomies
  contactMethodsData?: DatasetItem[];
  paymentMethodsData?: DatasetItem[];
  settlementMethodsData?: DatasetItem[];
}

export interface TaxonomyTab {
  id: string;
  slug: string;
  label: string;
  plural?: string;
  [key: string]: any; // Allow additional properties
}

export interface TaxonomyTabsProps {
  items: TaxonomyTab[];
  basePath: string;
  allItemsLabel: string;
  allItemsHref?: string; // Optional custom href for the first link
  activeItemSlug?: string;
  usePluralLabels?: boolean;
  className?: string;
}

export interface BreadcrumbButtonsProps {
  subjectTitle: string;
  id: string | number;
  saveType?: string;
  isOwner?: boolean;
}

export type ProfileBreadcrumbProfileData = {
  id: string;
  username: string;
  displayName: string;
  role: string; // This matches the Prisma schema where role is String
};

export interface ProfileBreadcrumbProps {
  profile: ProfileBreadcrumbProfileData;
  category?: DatasetItem;
  subcategory?: DatasetItem;
}

// Service Card Component Types
export type ServiceCardData = Pick<
  Service,
  'id' | 'title' | 'price' | 'rating' | 'reviewCount' | 'slug' | 'type'
> & {
  category?: string; // Kept for backward compatibility
  taxonomyLabels?: {
    category: string;
    subcategory: string;
    subdivision: string;
  };
  media: AppJson.Media;
  profile: Pick<
    Profile,
    'id' | 'uid' | 'username' | 'displayName' | 'image'
  > & {
    verified?: boolean;
    portfolio?: AppJson.Portfolio | null;
    coverage?: AppJson.Coverage | null;
    groupedCoverage?: Array<{ county: string; areas: string[] }>;
  };
};

// Profile Card Component Types
export type ProfileCardData = Pick<
  Profile,
  | 'id'
  | 'username'
  | 'displayName'
  | 'tagline'
  | 'subcategory'
  | 'speciality'
  | 'rating'
  | 'reviewCount'
  | 'verified'
  | 'image'
  | 'top'
>;

export interface ProfileCardProps {
  profile: ProfileCardData;
}

// Archive Component Types for Archives Feature

// Archive Profile Card Component Types
export type ArchiveProfileCardData = Pick<
  Profile,
  | 'id'
  | 'uid'
  | 'username'
  | 'displayName'
  | 'rating'
  | 'reviewCount'
  | 'verified'
  | 'featured'
  | 'top'
  | 'rate'
  | 'coverage'
  | 'image'
  | 'category'
  | 'subcategory'
  | 'tagline'
  | 'skills'
  | 'speciality'
> &
  Pick<User, 'role'> & {
    taxonomyLabels?: {
      category: string;
      subcategory: string;
    };
    skillsData: DatasetItem[];
    specialityData?: DatasetItem | null;
    groupedCoverage: Array<{ county: string; areas: string[] }>; // Pre-computed grouped coverage from server
  };

// Archive Service Card Component Types
export type ArchiveServiceCardData = Pick<
  Service,
  | 'id'
  | 'title'
  | 'slug'
  | 'price'
  | 'rating'
  | 'reviewCount'
  | 'media'
  | 'type'
> & {
  taxonomyLabels: {
    category: string;
    subcategory: string;
    subdivision: string;
    categorySlug?: string;
    subcategorySlug?: string;
    subdivisionSlug?: string;
    subdivisionId?: string;
  };
  profile: Pick<
    Profile,
    | 'id'
    | 'uid'
    | 'displayName'
    | 'username'
    | 'image'
    | 'coverage'
    | 'verified'
    | 'top'
    | 'rating'
    | 'reviewCount'
  > & {
    portfolio?: AppJson.Portfolio | null;
    groupedCoverage: Array<{ county: string; areas: string[] }>; // Pre-computed grouped coverage from server
  };
};

// Profile filter types for archives
export type ProfileFilters = Partial<
  Pick<
    Profile,
    'category' | 'subcategory' | 'published'
  >
> &
  Partial<
    Pick<
      User,
      'role' // for 'freelancer' | 'company' types
    >
  > & {
    county?: string; // Single county selection for coverage filtering
    online?: boolean; // Coverage.online field
    page?: number;
    limit?: number;
    sortBy?:
      | 'default'
      | 'recent'
      | 'oldest'
      | 'price_asc'
      | 'price_desc'
      | 'rating_high'
      | 'rating_low';
  };

// Enhanced filter types for comprehensive profile archives
export type ProfileArchiveFilters = ProfileFilters & {
  category?: string;
  subcategory?: string;
};

// Shared archive bundle building blocks (consumed by ArchiveLayout).

/** Taxonomy tree + current-node context the archive sidebar/breadcrumb read. */
export interface ArchiveTaxonomyData {
  categories: DatasetItem[];
  currentCategory?: DatasetItem | null;
  currentSubcategory?: DatasetItem | null;
  currentSubdivision?: DatasetItem | null;
  subcategories?: DatasetItem[];
  subdivisions?: DatasetItem[];
}

/** Breadcrumb segments (+ optional CTA buttons) for an archive page. */
export interface ArchiveBreadcrumbData {
  segments: Array<{ label: string; href?: string | null }>;
  buttons?: Array<{ label: string; href: string }>;
}

/**
 * One entry in the subcategory/subdivision chip carousel above an archive
 * listing — matches `ArchiveLayout`'s `availableSubdivisions` prop.
 */
export interface AvailableTaxonomyLeaf {
  id: string;
  label: string;
  slug: string;
  categorySlug: string | null;
  subcategorySlug: string | null;
  count: number;
  href: string;
  type?: 'freelancer' | 'company';
}

/**
 * Filters block echoed back by the archive selectors. Shaped to match the
 * `FilterState` the `ArchiveLayout` sidebar consumes via `initialFilters`.
 */
export interface ArchiveFilters {
  category?: string;
  subcategory?: string;
  subdivision?: string;
  county?: string;
  online?: boolean;
  sortBy?: string;
  search?: string;
  page?: number;
  limit?: number;
  type?: 'pros' | 'companies';
}

// Comprehensive PRO directory archive bundle (Django `archive_data`).
export interface ProfileArchivePageData {
  profiles: ArchiveProfileCardData[];
  total: number;
  hasMore: boolean;
  taxonomyData: ArchiveTaxonomyData;
  breadcrumbData: ArchiveBreadcrumbData;
  counties: DatasetItem[];
  filters: ArchiveFilters;
  availableSubcategories: AvailableTaxonomyLeaf[];
}

// Home page bundle (Django `home_page_data`) after frontend taxonomy
// enrichment. Shaped to feed the home section components directly.
export interface HomePageData {
  services: {
    mainCategories: Array<{ id: string; label: string; slug: string }>;
    servicesByCategory: Record<string, ServiceCardData[]>;
    allServices: ServiceCardData[];
  };
  profiles: ArchiveProfileCardData[];
  popularSubcategories: DatasetItem[];
  categoriesWithSubcategories: DatasetItem[];
  proSubcategoriesWithProfiles: DatasetItem[];
  serviceSubcategoriesWithServices: DatasetItem[];
}

// Comprehensive SERVICES archive bundle (Django service-archive selector).
export interface ServiceArchivePageData {
  services: ArchiveServiceCardData[];
  total: number;
  hasMore: boolean;
  taxonomyData: ArchiveTaxonomyData;
  breadcrumbData: ArchiveBreadcrumbData;
  counties: DatasetItem[];
  filters: ArchiveFilters;
  availableSubdivisions: AvailableTaxonomyLeaf[];
}
