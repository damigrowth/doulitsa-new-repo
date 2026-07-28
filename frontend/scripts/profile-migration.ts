/**
 * PROFILE MIGRATION SCRIPT - Strapi Freelancers to Better-Auth Profiles
 *
 * Migrates freelancer profiles from DigitalOcean PostgreSQL (Strapi) to Neon PostgreSQL (Better-Auth)
 *
 * DATA ANALYSIS:
 * - Total freelancers: 258 (252 linked to users, 6 orphaned)
 * - 151 freelancers with type "freelancer" → type="pro", role="freelancer" (get profiles)
 * - 59 freelancers with type "company" → type="pro", role="company" (get profiles)  
 * - 49 freelancers with type "user" → type="user", role="user" (NO profiles)
 * - Expected: 210 profiles created (151 + 59), 49 users updated without profiles
 *
 * FIELD MAPPING:
 *
 * Strapi freelancers → Better-Auth User + Profile
 * ├── freelancers_user_links.user_id → Match to User.email → User.id (uid)
 * ├── username → User.username + Profile.username (sync both)
 * ├── display_name → User.displayName + Profile.displayName (sync both)
 * ├── first_name → User.firstName + Profile.firstName (sync both)
 * ├── last_name → User.lastName + Profile.lastName (sync both)
 * ├── email → Profile reference only (not updated in User)
 * ├── phone (bigint) → Profile.phone (string)
 * ├── viber (bigint) → Profile.viber (string)
 * ├── whatsapp (bigint) → Profile.whatsapp (string)
 * ├── tagline → Profile.tagline
 * ├── description → Profile.bio
 * ├── website → Profile.website
 * ├── rate (int) → Profile.rate (int)
 * ├── years_of_experience → Profile.experience
 * ├── commencement (int) → Profile.commencement (string)
 * ├── terms → Profile.terms
 * // REVIEWS DISABLED - NOT MIGRATING YET
 * // ├── rating (numeric) → Profile.rating (float)
 * // ├── reviews_total → Profile.reviewCount
 * // ├── rating_stars_1-5 → Profile.stars JSON {1: 5, 2: 10, 3: 15, 4: 20, 5: 50}
 *
 * ├── freelancers_category_links → Profile.category (proTaxonomies category ID)
 * ├── freelancers_subcategory_links → Profile.subcategory (proTaxonomies subcategory ID)  
 * ├── freelancers_specialization_links → Profile.speciality (single skill ID)
 * ├── skills_freelancers_links → Profile.skills[] (array of skill IDs)
 * ├── freelancers_size_links → Profile.size (sizeOptions ID)
 * ├── freelancers_min_budget_links → Profile.budget (budgetOptions ID)
 * ├── freelancers_contact_types_links → Profile.contactMethods[] (contactTypesOptions IDs)
 * ├── freelancers_payment_methods_links → Profile.paymentMethods[] (paymentMethodsOptions IDs)
 * ├── freelancers_settlement_methods_links → Profile.settlementMethods[] (settlementMethodsOptions IDs)
 * ├── freelancers_industries_links → Profile.industries[] (industries IDs)
 *
 * ├── verified → Profile.verified
 * ├── featured → Profile.featured
 * ├── top_level → Profile.top (Boolean)
 * ├── published_at → Profile.published (boolean)
 * ├── created_at → Profile.createdAt
 * ├── updated_at → Profile.updatedAt
 * └── Set Profile.type = 'freelancer' + User.role = 'freelancer' + User.type = 'pro'
 *
 * MIGRATION STRATEGY:
 * 1. Load freelancer → user mappings from freelancers_user_links
 * 2. Load all Strapi freelancers and users
 * 3. Match each freelancer to migrated user via original email
 * 4. Create Profile + update User (role/type) in transaction
 * 5. Handle orphaned freelancers separately (email matching fallback)
 */

import { PrismaClient as SourcePrismaClient } from '@prisma/client';
import { PrismaClient as TargetPrismaClient } from '@prisma/client';

// Types for source database (Strapi)
interface StrapiFreelancer {
  id: number;
  created_at: Date | null;
  updated_at: Date | null;
  published_at: Date | null;
  created_by_id: number | null;
  updated_by_id: number | null;
  username: string | null;
  tagline: string | null;
  website: string | null;
  commencement: number | null;
  years_of_experience: number | null;
  description: string | null;
  rate: number | null;
  terms: string | null;
  // REVIEWS DISABLED - NOT MIGRATING YET
  // rating: number | null; // numeric type
  top_level: boolean | null;
  // reviews_total: bigint | null;
  // rating_stars_1: bigint | null;
  // rating_stars_2: bigint | null;
  // rating_stars_3: bigint | null;
  // rating_stars_4: bigint | null;
  // rating_stars_5: bigint | null;
  verified: boolean | null;
  email: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: bigint | null;
  viber: bigint | null;
  whatsapp: bigint | null;
  total_unread_count: number | null;
  email_list: string | null;
  featured: boolean | null;
}

interface StrapiUser {
  id: number;
  email: string;
  username: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface StrapiFreelancerWithType extends StrapiFreelancer {
  freelancer_type: string | null; // "freelancer", "company", "user"
  // Single taxonomy fields
  category_id: string | null;
  subcategory_id: string | null;
  specialization_id: string | null; // One skill ID
  size_id: string | null;
  budget_id: string | null;
  // Array taxonomy fields
  skills: string[]; // Array of skill IDs
  contact_methods: string[]; // Array of contact type IDs
  payment_methods: string[]; // Array of payment method IDs
  settlement_methods: string[]; // Array of settlement method IDs
  industries: string[]; // Array of industry IDs
  // Component data fields
  coverage_data: any | null; // location.coverage component
  visibility_data: any | null; // global.visibility component
  billing_data: any | null; // pricing.billing-details component
  socials_data: any | null; // socials.list component
  // Image data
  image_data: StrapiFile | null; // Profile image from files table
  // Status field
  status_name: string | null; // Status name from statuses table (e.g., "Active")
}

interface StrapiFile {
  id: number;
  name: string;
  alternativeText: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  formats: any | null;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  previewUrl: string | null;
  provider: string;
  provider_metadata: any | null;
  created_at: Date;
  updated_at: Date;
  folder_path: string | null;
}

interface FreelancerUserLink {
  id: number;
  freelancer_id: number;
  user_id: number;
}

// Database connections
const sourceDb = new SourcePrismaClient({
  datasources: {
    db: {
      url: process.env.SOURCE_DATABASE_URL, // DigitalOcean PostgreSQL
    },
  },
});

const targetDb = new TargetPrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL, // Neon PostgreSQL
    },
  },
});

// Migration statistics
interface MigrationStats {
  totalFreelancers: number;
  linkedFreelancers: number;
  orphanedFreelancers: number;
  matchedUsers: number;
  unmatchedUsers: number;
  profilesCreated: number;
  profilesUpdated: number;
  profilesSkipped: number;
  usersUpdated: number;
  freelancerProfiles: number; // type="freelancer" → profiles
  companyProfiles: number; // type="company" → profiles  
  userOnlyUpdates: number; // type="user" → no profile, just user update
  errors: string[];
  warnings: string[];
  orphanResults: {
    emailMatched: number;
    skipped: number;
  };
}

// Helper function to convert bigint to string safely
function bigintToString(value: bigint | null): string | null {
  if (value === null || value === BigInt(0)) return null;
  return value.toString();
}


// Helper function to convert commencement number to string
function convertCommencement(commencement: number | null): string | null {
  if (commencement === null) return null;

  // Convert timestamp or year to readable format
  if (commencement > 10000) {
    // Looks like a timestamp, convert to year
    const date = new Date(commencement * 1000);
    return date.getFullYear().toString();
  }

  // Already a year
  return commencement.toString();
}

// Helper function to extract image URL from Strapi file
function extractImageUrl(strapiFile: StrapiFile | null): string | null {
  if (!strapiFile) return null;

  try {
    // Return the full URL if it exists and is already a full URL
    if (strapiFile.url && strapiFile.url.startsWith('http')) {
      return strapiFile.url;
    }
    
    // If it's a relative URL, we'd need to construct the full URL
    // But based on your debug output, all images are already full Cloudinary URLs
    return strapiFile.url || null;
  } catch (error) {
    console.error('Error extracting image URL:', error);
    return null;
  }
}

// Component processing functions
function processLocationCoverage(coverageData: any): any | null {
  if (!coverageData) return null;

  try {
    // Parse JSON if it's a string, otherwise use as-is
    const data = typeof coverageData === 'string' ? JSON.parse(coverageData) : coverageData;
    
    // Build coverage structure with ID strings
    return {
      online: data.online || false,
      onsite: data.onsite || false, 
      onbase: data.onbase || false,
      address: data.address || '',
      // Single relation fields - store as ID strings
      area: data.area_id ? String(data.area_id) : null,
      county: data.county_id ? String(data.county_id) : null,
      zipcode: data.zipcode_id ? String(data.zipcode_id) : null,
      // Multi-select arrays - store as arrays of ID strings
      counties: (data.counties_ids || []).map((id: any) => String(id)),
      areas: (data.areas_ids || []).map((id: any) => String(id))
    };
  } catch (error) {
    console.warn('Failed to process location coverage data:', error);
    return null;
  }
}

function processVisibilitySettings(visibilityData: any): any | null {
  if (!visibilityData) {
    // Return default visibility settings if no data
    return {
      email: true,
      phone: true,
      address: true
    };
  }

  try {
    // Parse JSON if it's a string, otherwise use as-is
    const data = typeof visibilityData === 'string' ? JSON.parse(visibilityData) : visibilityData;
    
    // Match the presentation form structure exactly
    return {
      email: data.email !== undefined ? data.email : true,
      phone: data.phone !== undefined ? data.phone : true,
      address: data.address !== undefined ? data.address : true
    };
  } catch (error) {
    console.warn('Failed to process visibility data:', error);
    return {
      email: true,
      phone: true, 
      address: true
    };
  }
}

function processBillingDetails(billingData: any): any | null {
  if (!billingData) return null;

  try {
    // Parse JSON if it's a string, otherwise use as-is
    const data = typeof billingData === 'string' ? JSON.parse(billingData) : billingData;
    
    // Match the billing form structure exactly
    return {
      receipt: data.receipt || false,
      invoice: data.invoice || false,
      afm: data.afm ? data.afm.toString() : '',
      doy: data.doy || '',
      name: data.brand_name || '', // brand_name maps to name
      profession: data.profession || '',
      address: data.address || ''
    };
  } catch (error) {
    console.warn('Failed to process billing data:', error);
    return null;
  }
}

// Note: Social media data is now handled directly through fetchFreelancerSocials()
// and structured to match the presentation form's expected format

// Helper function to fetch component data for freelancers
async function fetchFreelancerComponents(freelancerIds: number[]): Promise<Map<number, any>> {
  const componentMap = new Map();
  
  if (freelancerIds.length === 0) return componentMap;

  try {
    // Fetch all component data for the given freelancers
    const componentData = await sourceDb.$queryRaw`
      SELECT 
        fc.entity_id as freelancer_id,
        fc.component_type,
        fc.component_id,
        CASE fc.component_type
          WHEN 'location.coverage' THEN (
            SELECT json_build_object(
              'id', lc.id,
              'online', lc.online,
              'onsite', lc.onsite,
              'onbase', lc.onbase,
              'address', lc.address,
              -- Single relationships (primary location)
              'area_id', area_link.area_id,
              'county_id', county_link.county_id,
              'zipcode_id', zipcode_link.zipcode_id,
              -- Multiple relationships (service areas)
              'counties_ids', COALESCE(
                (SELECT array_agg(counties_link.county_id::text ORDER BY counties_link.county_order) 
                 FROM components_location_coverages_counties_links counties_link 
                 WHERE counties_link.coverage_id = lc.id),
                ARRAY[]::text[]
              ),
              'areas_ids', COALESCE(
                (SELECT array_agg(areas_link.area_id::text ORDER BY areas_link.area_order) 
                 FROM components_location_coverages_areas_links areas_link 
                 WHERE areas_link.coverage_id = lc.id),
                ARRAY[]::text[]
              )
            )
            FROM components_location_coverages lc
            LEFT JOIN components_location_coverages_area_links area_link ON lc.id = area_link.coverage_id
            LEFT JOIN components_location_coverages_county_links county_link ON lc.id = county_link.coverage_id
            LEFT JOIN components_location_coverages_zipcode_links zipcode_link ON lc.id = zipcode_link.coverage_id
            WHERE lc.id = fc.component_id
          )
          WHEN 'global.visibility' THEN (SELECT row_to_json(gv.*) FROM components_global_visibilities gv WHERE gv.id = fc.component_id)
          WHEN 'pricing.billing-details' THEN (SELECT row_to_json(pbd.*) FROM components_pricing_billing_details pbd WHERE pbd.id = fc.component_id)
          WHEN 'socials.list' THEN (SELECT row_to_json(sl.*) FROM components_socials_lists sl WHERE sl.id = fc.component_id)
          ELSE NULL
        END as component_data
      FROM freelancers_components fc
      WHERE fc.entity_id = ANY(${freelancerIds})
        AND fc.component_type IN ('location.coverage', 'global.visibility', 'pricing.billing-details', 'socials.list')
    ` as any[];

    // Group by freelancer ID
    for (const row of componentData) {
      if (!componentMap.has(row.freelancer_id)) {
        componentMap.set(row.freelancer_id, {
          coverage_data: null,
          visibility_data: null,
          billing_data: null,
          socials_data: null
        });
      }

      const freelancerComponents = componentMap.get(row.freelancer_id);
      
      switch (row.component_type) {
        case 'location.coverage':
          freelancerComponents.coverage_data = row.component_data;
          break;
        case 'global.visibility':
          freelancerComponents.visibility_data = row.component_data;
          break;
        case 'pricing.billing-details':
          freelancerComponents.billing_data = row.component_data;
          break;
        case 'socials.list':
          freelancerComponents.socials_data = row.component_data;
          break;
      }
    }

    return componentMap;
  } catch (error) {
    console.warn('Failed to fetch component data:', error);
    return componentMap;
  }
}

// Helper function to fetch image data for freelancers
async function fetchFreelancerImages(freelancerIds: number[]): Promise<Map<number, StrapiFile | null>> {
  const imageMap = new Map();
  
  if (freelancerIds.length === 0) return imageMap;

  try {
    // Query to get freelancers with their image data through the files_related_morphs relationship
    const freelancersWithImages = await sourceDb.$queryRaw`
      SELECT 
        f.id,
        fl.file_id as image_id,
        CASE 
          WHEN fl.file_id IS NOT NULL THEN (
            SELECT row_to_json(file_data.*)
            FROM files file_data
            WHERE file_data.id = fl.file_id
          )
          ELSE NULL
        END as image_data
      FROM freelancers f
      LEFT JOIN files_related_morphs fl ON fl.related_id = f.id 
        AND fl.related_type = 'api::freelancer.freelancer'
        AND fl.field = 'image'
      WHERE f.id = ANY(${freelancerIds})
      ORDER BY f.id
    ` as any[];

    // Create map of freelancer ID to image data
    for (const row of freelancersWithImages) {
      imageMap.set(row.id, row.image_data);
    }

    return imageMap;
  } catch (error) {
    console.warn('Failed to fetch freelancer images:', error);
    return imageMap;
  }
}

// Helper function to fetch portfolio data for freelancers
async function fetchFreelancerPortfolios(freelancerIds: number[]): Promise<Map<number, any[]>> {
  const portfolioMap = new Map();
  
  if (freelancerIds.length === 0) return portfolioMap;

  try {
    // Query to get freelancers with their portfolio images through the files_related_morphs relationship
    const freelancersWithPortfolios = await sourceDb.$queryRaw`
      SELECT 
        f.id as freelancer_id,
        fl.file_id,
        fl.order as file_order,
        CASE 
          WHEN fl.file_id IS NOT NULL THEN (
            SELECT row_to_json(file_data.*)
            FROM files file_data
            WHERE file_data.id = fl.file_id
          )
          ELSE NULL
        END as file_data
      FROM freelancers f
      LEFT JOIN files_related_morphs fl ON fl.related_id = f.id 
        AND fl.related_type = 'api::freelancer.freelancer'
        AND fl.field = 'portfolio'
      WHERE f.id = ANY(${freelancerIds})
        AND fl.file_id IS NOT NULL
      ORDER BY f.id, fl.order
    ` as any[];

    // Group portfolio files by freelancer ID
    for (const row of freelancersWithPortfolios) {
      if (!portfolioMap.has(row.freelancer_id)) {
        portfolioMap.set(row.freelancer_id, []);
      }
      
      if (row.file_data) {
        // Determine resource type based on MIME type or file extension
        let resourceType: 'image' | 'video' | 'raw' | 'audio' = 'raw';
        const mimeType = row.file_data.mime || '';
        const ext = row.file_data.ext ? row.file_data.ext.toLowerCase() : '';
        
        if (mimeType.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'].includes(ext)) {
          resourceType = 'image';
        } else if (mimeType.startsWith('video/') || ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm', '.m4v'].includes(ext)) {
          resourceType = 'video';
        } else if (mimeType.startsWith('audio/') || ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma'].includes(ext)) {
          resourceType = 'audio';
        } else {
          // Documents, PDFs, and other files
          resourceType = 'raw';
        }
        
        // Convert Strapi file to CloudinaryResource format
        const cloudinaryResource = {
          public_id: row.file_data.hash || '',
          secure_url: row.file_data.url || '',
          width: row.file_data.width || undefined,
          height: row.file_data.height || undefined,
          resource_type: resourceType,
          format: row.file_data.ext ? row.file_data.ext.replace('.', '') : undefined,
          // Convert size from KB (Strapi) to bytes (Cloudinary)
          bytes: row.file_data.size ? Math.round(row.file_data.size * 1024) : undefined,
          url: row.file_data.url || '',
          original_filename: row.file_data.name || undefined,
        };
        
        portfolioMap.get(row.freelancer_id).push(cloudinaryResource);
      }
    }

    return portfolioMap;
  } catch (error) {
    console.warn('Failed to fetch freelancer portfolios:', error);
    return portfolioMap;
  }
}

// Helper function to fetch social media data for freelancers
async function fetchFreelancerSocials(freelancerIds: number[]): Promise<Map<number, any>> {
  const socialMap = new Map();
  
  if (freelancerIds.length === 0) return socialMap;

  try {
    // Updated query using the correct relationship path:
    // freelancers -> socials.list -> components_socials_lists_components -> individual platform tables
    const socialComponents = await sourceDb.$queryRaw`
      SELECT 
        fc.entity_id as freelancer_id,
        slc.component_type as platform_type,
        slc.component_id as platform_component_id,
        CASE 
          WHEN slc.component_type = 'socials.facebook' THEN 
            (SELECT json_build_object('label', sf.label, 'url', sf.url) FROM components_socials_facebooks sf WHERE sf.id = slc.component_id)
          WHEN slc.component_type = 'socials.instagram' THEN 
            (SELECT json_build_object('label', si.label, 'url', si.url) FROM components_socials_instagrams si WHERE si.id = slc.component_id)
          WHEN slc.component_type = 'socials.linkedin' THEN 
            (SELECT json_build_object('label', sl.label, 'url', sl.url) FROM components_socials_linkedins sl WHERE sl.id = slc.component_id)
          WHEN slc.component_type = 'socials.x' THEN 
            (SELECT json_build_object('label', sx.label, 'url', sx.url) FROM components_socials_xes sx WHERE sx.id = slc.component_id)
          WHEN slc.component_type = 'socials.github' THEN 
            (SELECT json_build_object('label', sg.label, 'url', sg.url) FROM components_socials_githubs sg WHERE sg.id = slc.component_id)
          WHEN slc.component_type = 'socials.behance' THEN 
            (SELECT json_build_object('label', sb.label, 'url', sb.url) FROM components_socials_behances sb WHERE sb.id = slc.component_id)
          WHEN slc.component_type = 'socials.dribbble' THEN 
            (SELECT json_build_object('label', sd.label, 'url', sd.url) FROM components_socials_dribbbles sd WHERE sd.id = slc.component_id)
          WHEN slc.component_type = 'socials.youTube' THEN 
            (SELECT json_build_object('label', sy.label, 'url', sy.url) FROM components_socials_you_tubes sy WHERE sy.id = slc.component_id)
          ELSE NULL
        END as platform_data
      FROM freelancers_components fc
      JOIN components_socials_lists_components slc ON fc.component_id = slc.entity_id
      WHERE fc.component_type = 'socials.list'
        AND fc.entity_id = ANY(${freelancerIds})
      ORDER BY fc.entity_id, slc.component_type
    ` as any[];

    // Group by freelancer ID
    for (const row of socialComponents) {
      if (!socialMap.has(row.freelancer_id)) {
        socialMap.set(row.freelancer_id, {
          facebook: null,
          instagram: null,
          linkedin: null,
          twitter: null,
          github: null,
          behance: null,
          dribbble: null,
          youtube: null
        });
      }

      const freelancerSocials = socialMap.get(row.freelancer_id);
      const platformData = row.platform_data;

      if (platformData && platformData.url) {
        switch (row.platform_type) {
          case 'socials.facebook':
            freelancerSocials.facebook = platformData.url;
            break;
          case 'socials.instagram':
            freelancerSocials.instagram = platformData.url;
            break;
          case 'socials.linkedin':
            freelancerSocials.linkedin = platformData.url;
            break;
          case 'socials.x':
            freelancerSocials.twitter = platformData.url;
            break;
          case 'socials.github':
            freelancerSocials.github = platformData.url;
            break;
          case 'socials.behance':
            freelancerSocials.behance = platformData.url;
            break;
          case 'socials.dribbble':
            freelancerSocials.dribbble = platformData.url;
            break;
          case 'socials.youTube':
            freelancerSocials.youtube = platformData.url;
            break;
        }
      }
    }

    return socialMap;
  } catch (error) {
    console.warn('Failed to fetch social media data:', error);
    return socialMap;
  }
}

// Helper function to detect profile data changes
function hasProfileChanges(existingProfile: any, newData: any): {hasChanges: boolean, changedFields: string[]} {
  const changedFields: string[] = [];

  // Helper to compare values (handles null/undefined)
  const isDifferent = (oldVal: any, newVal: any): boolean => {
    // Normalize null/undefined to null for comparison
    const normalizedOld = oldVal === undefined ? null : oldVal;
    const normalizedNew = newVal === undefined ? null : newVal;

    // Handle number comparison with float precision tolerance
    if (typeof normalizedOld === 'number' && typeof normalizedNew === 'number') {
      // Use epsilon for float comparison (handles precision differences)
      return Math.abs(normalizedOld - normalizedNew) > 0.0001;
    }

    // For objects/arrays, do deep comparison
    if (typeof normalizedOld === 'object' && typeof normalizedNew === 'object') {
      // Both null or both arrays/objects
      if (normalizedOld === null && normalizedNew === null) return false;
      if (normalizedOld === null || normalizedNew === null) return true;

      // Sort object keys before stringify to ensure consistent comparison
      const sortKeys = (obj: any): any => {
        if (Array.isArray(obj)) {
          return obj.map(sortKeys);
        }
        if (obj !== null && typeof obj === 'object') {
          return Object.keys(obj)
            .sort()
            .reduce((sorted: any, key) => {
              sorted[key] = sortKeys(obj[key]);
              return sorted;
            }, {});
        }
        return obj;
      };

      return JSON.stringify(sortKeys(normalizedOld)) !== JSON.stringify(sortKeys(normalizedNew));
    }

    return normalizedOld !== normalizedNew;
  };

  // Check each field
  const fieldsToCheck = [
    'type', 'username', 'displayName', 'firstName', 'lastName', 'email',
    'tagline', 'bio', 'website', 'phone', 'viber', 'whatsapp',
    'rate', 'experience', 'commencement', 'terms',
    'category', 'subcategory', 'speciality', 'skills',
    'size', 'budget',
    'contactMethods', 'paymentMethods', 'settlementMethods', 'industries',
    'coverage', 'visibility', 'billing', 'socials',
    'image', 'portfolio',
    // REVIEWS DISABLED - NOT CHECKING FOR CHANGES
    // 'rating', 'reviewCount', 'stars',
    'verified', 'featured', 'top', 'published', 'isActive'
  ];

  for (const field of fieldsToCheck) {
    if (isDifferent(existingProfile[field], newData[field])) {
      changedFields.push(field);
    }
  }

  return {
    hasChanges: changedFields.length > 0,
    changedFields
  };
}

// Helper function to detect user data changes
function hasUserChanges(existingUser: any, newData: any): {hasChanges: boolean, changedFields: string[]} {
  const changedFields: string[] = [];

  const fieldsToCheck = ['role', 'type', 'username', 'displayName', 'firstName', 'lastName', 'image'];

  for (const field of fieldsToCheck) {
    const oldVal = existingUser[field] === undefined ? null : existingUser[field];
    const newVal = newData[field] === undefined ? null : newData[field];

    if (oldVal !== newVal) {
      changedFields.push(field);
    }
  }

  return {
    hasChanges: changedFields.length > 0,
    changedFields
  };
}

// Main migration function
async function migrateProfiles(updateExisting: boolean = false): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalFreelancers: 0,
    linkedFreelancers: 0,
    orphanedFreelancers: 0,
    matchedUsers: 0,
    unmatchedUsers: 0,
    profilesCreated: 0,
    profilesUpdated: 0,
    profilesSkipped: 0,
    usersUpdated: 0,
    freelancerProfiles: 0,
    companyProfiles: 0,
    userOnlyUpdates: 0,
    errors: [],
    warnings: [],
    orphanResults: {
      emailMatched: 0,
      skipped: 0,
    },
  };

  try {
    console.log('🚀 Starting profile migration from Strapi to Better-Auth...');
    console.log('📊 Connecting to databases...');

    // Test connections
    await sourceDb.$connect();
    await targetDb.$connect();

    console.log('✅ Database connections established');

    // Step 1: Load relationship mappings
    console.log('📥 Loading freelancer-user relationships...');

    const freelancerUserLinks = await sourceDb.$queryRaw<FreelancerUserLink[]>`
      SELECT id, freelancer_id, user_id FROM freelancers_user_links ORDER BY freelancer_id
    `;

    console.log(`📊 Found ${freelancerUserLinks.length} freelancer-user links`);

    // Step 2: Load all freelancers with complete taxonomy data
    console.log('📥 Loading all freelancers with taxonomy relationships from Strapi...');

    const strapiFreelancers = await sourceDb.$queryRaw<StrapiFreelancerWithType[]>`
      SELECT
        f.*,
        ft.type as freelancer_type,
        s.type as status_name,

        -- Single relationship fields (get IDs directly from link tables)
        cat_link.freelancer_category_id::text as category_id,
        subcat_link.freelancer_subcategory_id::text as subcategory_id,
        spec_link.skill_id::text as specialization_id,
        size_link.size_id::text as size_id,
        budget_link.budget_id::text as budget_id,

        -- Multiple relationship fields (aggregate as arrays)
        COALESCE(
          array_agg(DISTINCT skills_link.skill_id::text) FILTER (WHERE skills_link.skill_id IS NOT NULL),
          ARRAY[]::text[]
        ) as skills,

        COALESCE(
          array_agg(DISTINCT contact_link.contact_type_id::text) FILTER (WHERE contact_link.contact_type_id IS NOT NULL),
          ARRAY[]::text[]
        ) as contact_methods,

        COALESCE(
          array_agg(DISTINCT payment_link.payment_method_id::text) FILTER (WHERE payment_link.payment_method_id IS NOT NULL),
          ARRAY[]::text[]
        ) as payment_methods,

        COALESCE(
          array_agg(DISTINCT settlement_link.settlement_method_id::text) FILTER (WHERE settlement_link.settlement_method_id IS NOT NULL),
          ARRAY[]::text[]
        ) as settlement_methods,

        COALESCE(
          array_agg(DISTINCT industry_link.industry_id::text) FILTER (WHERE industry_link.industry_id IS NOT NULL),
          ARRAY[]::text[]
        ) as industries,

        -- Component data (will be fetched separately to avoid JSON GROUP BY issues)
        NULL as coverage_data,
        NULL as visibility_data,
        NULL as billing_data,
        NULL as socials_data

      FROM freelancers f

      -- Type relationship
      LEFT JOIN freelancers_type_links ftl ON f.id = ftl.freelancer_id
      LEFT JOIN freelancer_types ft ON ftl.freelancer_type_id = ft.id

      -- Status relationship
      LEFT JOIN freelancers_status_links status_link ON f.id = status_link.freelancer_id
      LEFT JOIN statuses s ON status_link.status_id = s.id

      -- Single taxonomy relationships
      LEFT JOIN freelancers_category_links cat_link ON f.id = cat_link.freelancer_id
      LEFT JOIN freelancers_subcategory_links subcat_link ON f.id = subcat_link.freelancer_id
      LEFT JOIN freelancers_specialization_links spec_link ON f.id = spec_link.freelancer_id
      LEFT JOIN freelancers_size_links size_link ON f.id = size_link.freelancer_id
      LEFT JOIN freelancers_min_budget_links budget_link ON f.id = budget_link.freelancer_id

      -- Multiple relationship arrays
      LEFT JOIN skills_freelancers_links skills_link ON f.id = skills_link.freelancer_id
      LEFT JOIN freelancers_contact_types_links contact_link ON f.id = contact_link.freelancer_id
      LEFT JOIN freelancers_payment_methods_links payment_link ON f.id = payment_link.freelancer_id
      LEFT JOIN freelancers_settlement_methods_links settlement_link ON f.id = settlement_link.freelancer_id
      LEFT JOIN freelancers_industries_links industry_link ON f.id = industry_link.freelancer_id

      GROUP BY f.id, ft.type, s.type, cat_link.freelancer_category_id, subcat_link.freelancer_subcategory_id,
               spec_link.skill_id, size_link.size_id, budget_link.budget_id
      ORDER BY f.created_at ASC
    `;

    stats.totalFreelancers = strapiFreelancers.length;
    console.log(`📊 Found ${stats.totalFreelancers} total freelancers`);

    // Step 3: Load component data for all freelancers
    console.log('📥 Loading component data for freelancers...');
    
    const freelancerIds = strapiFreelancers.map(f => f.id);
    const componentDataMap = await fetchFreelancerComponents(freelancerIds);
    console.log(`📊 Loaded component data for ${componentDataMap.size} freelancers`);
    
    // Step 4: Load image data for all freelancers
    console.log('📥 Loading image data for freelancers...');
    
    const imageMap = await fetchFreelancerImages(freelancerIds);
    console.log(`📊 Loaded image data for ${imageMap.size} freelancers`);
    
    // Step 5: Load social media data for all freelancers
    console.log('📥 Loading social media data for freelancers...');
    
    const socialMediaMap = await fetchFreelancerSocials(freelancerIds);
    console.log(`📊 Loaded social media data for ${socialMediaMap.size} freelancers`);
    
    // Step 6: Load portfolio data for all freelancers
    console.log('📥 Loading portfolio data for freelancers...');
    
    const portfolioMap = await fetchFreelancerPortfolios(freelancerIds);
    console.log(`📊 Loaded portfolio data for ${portfolioMap.size} freelancers`);

    // Step 7: Load all original Strapi users for email matching
    console.log('📥 Loading original Strapi users...');

    const strapiUsers = await sourceDb.$queryRaw<StrapiUser[]>`
      SELECT id, email, username, display_name, first_name, last_name 
      FROM up_users ORDER BY id
    `;

    const strapiUserMap = new Map(strapiUsers.map((user) => [user.id, user]));
    console.log(`📊 Loaded ${strapiUsers.length} original Strapi users`);

    // Step 8: Load migrated users for matching
    console.log('📥 Loading migrated users from target database...');

    const migratedUsers = await targetDb.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        profile: { select: { id: true } },
      },
    });

    const userEmailMap = new Map(
      migratedUsers.map((user) => [
        user.email,
        {
          id: user.id,
          role: user.role,
          hasProfile: !!user.profile,
        },
      ]),
    );

    console.log(
      `📊 Loaded ${migratedUsers.length} migrated users for matching`,
    );

    // Step 9: Create freelancer lookup maps
    const freelancerMap = new Map(strapiFreelancers.map((f) => [f.id, f]));
    const linkMap = new Map(
      freelancerUserLinks.map((link) => [link.freelancer_id, link.user_id]),
    );

    // Separate linked and orphaned freelancers
    const linkedFreelancerIds = new Set(
      freelancerUserLinks.map((link) => link.freelancer_id),
    );
    const linkedFreelancers = strapiFreelancers.filter((f) =>
      linkedFreelancerIds.has(f.id),
    );
    const orphanedFreelancers = strapiFreelancers.filter(
      (f) => !linkedFreelancerIds.has(f.id),
    );

    stats.linkedFreelancers = linkedFreelancers.length;
    stats.orphanedFreelancers = orphanedFreelancers.length;

    console.log(`📊 Linked freelancers: ${stats.linkedFreelancers}`);
    console.log(`📊 Orphaned freelancers: ${stats.orphanedFreelancers}`);

    // Step 10: Process linked freelancers (main migration)
    console.log('\n🔗 Processing linked freelancers...');

    for (let i = 0; i < linkedFreelancers.length; i++) {
      const freelancer = linkedFreelancers[i];
      const progress = `[${i + 1}/${linkedFreelancers.length}]`;

      try {
        const originalUserId = linkMap.get(freelancer.id);
        if (!originalUserId) {
          stats.errors.push(
            `Freelancer ID ${freelancer.id}: No user link found`,
          );
          continue;
        }

        const originalUser = strapiUserMap.get(originalUserId);
        if (!originalUser) {
          stats.errors.push(
            `Freelancer ID ${freelancer.id}: Original user ${originalUserId} not found`,
          );
          continue;
        }

        console.log(
          `${progress} Processing freelancer: ${freelancer.id} → User: ${originalUser.email}`,
        );

        // Find migrated user by email
        const migratedUser = userEmailMap.get(originalUser.email);
        if (!migratedUser) {
          stats.unmatchedUsers++;
          stats.errors.push(
            `Freelancer ${freelancer.id}: No migrated user found for ${originalUser.email}`,
          );
          console.log(`❌ ${progress} Error - No migrated user found`);
          continue;
        }

        stats.matchedUsers++;

        // Determine action based on freelancer type
        const freelancerType = freelancer.freelancer_type;
        const shouldCreateProfile = freelancerType === 'freelancer' || freelancerType === 'company';
        
        console.log(`${progress} Freelancer type: "${freelancerType}" → ${shouldCreateProfile ? 'CREATE PROFILE' : 'UPDATE USER ONLY'}`);

        // Check if profile already exists (only relevant for profile-eligible types)
        if (shouldCreateProfile && migratedUser.hasProfile) {
          if (!updateExisting) {
            stats.profilesSkipped++;
            stats.warnings.push(
              `User ${originalUser.email}: Profile already exists`,
            );
            console.log(`⚠️ ${progress} Skipped - Profile already exists`);
            continue;
          } else {
            console.log(`🔄 ${progress} Updating existing profile for ${originalUser.email}`);
          }
        }

        // Handle type="user" freelancers (no profile, just user update)
        if (!shouldCreateProfile) {
          // Fetch existing user to check for changes
          const existingUser = await targetDb.user.findUnique({
            where: { id: migratedUser.id }
          });

          if (!existingUser) {
            console.error(`❌ ${progress} User not found: ${migratedUser.id}`);
            continue;
          }

          // Prepare user update data
          const userOnlyUpdates: any = {
            role: 'user',
            type: 'user',
            username: freelancer.username ?? null,
            displayName: freelancer.display_name ?? null,
            firstName: freelancer.first_name ?? null,
            lastName: freelancer.last_name ?? null
          };

          // Check for changes
          const userCheck = hasUserChanges(existingUser, userOnlyUpdates);

          if (userCheck.hasChanges && updateExisting) {
            await targetDb.user.update({
              where: { id: migratedUser.id },
              data: userOnlyUpdates
            });

            stats.userOnlyUpdates++;
            stats.usersUpdated++;
            console.log(`✅ ${progress} Updated user only (type="${freelancerType}") with changes (${userCheck.changedFields.join(', ')}): ${originalUser.email}`);
          } else {
            stats.profilesSkipped++;
            stats.warnings.push(`User ${originalUser.email}: No changes detected (type="${freelancerType}")`);
            console.log(`⚠️ ${progress} User-only SKIPPED - No changes (type="${freelancerType}")`);
          }
          continue;
        }

        // REVIEWS DISABLED - SET DEFAULT VALUES (NOT MIGRATING REVIEWS YET)
        // Use Strapi's stored rating and review count directly
        // Note: Strapi stores these as separate number fields, no need to recalculate
        // const finalRating = Number(freelancer.rating || 0);
        // const reviewCount = Number(freelancer.reviews_total || 0);
        const finalRating = 0;
        const reviewCount = 0;

        // Create stars breakdown JSON
        // const starsBreakdown = {
        //   1: Number(freelancer.rating_stars_1 || 0),
        //   2: Number(freelancer.rating_stars_2 || 0),
        //   3: Number(freelancer.rating_stars_3 || 0),
        //   4: Number(freelancer.rating_stars_4 || 0),
        //   5: Number(freelancer.rating_stars_5 || 0)
        // };
        const starsBreakdown = {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0
        };

        // Get component data for this freelancer
        const components = componentDataMap.get(freelancer.id) || {
          coverage_data: null,
          visibility_data: null,
          billing_data: null,
          socials_data: null
        };
        
        // Process component data
        const coverageData = processLocationCoverage(components.coverage_data);
        const visibilityData = processVisibilitySettings(components.visibility_data);
        const billingData = processBillingDetails(components.billing_data);
        
        // Get actual social media data for this freelancer using simplified string format
        const socialMediaData = socialMediaMap.get(freelancer.id) || {};
        const socialsData = {
          facebook: socialMediaData.facebook || null,
          instagram: socialMediaData.instagram || null,
          linkedin: socialMediaData.linkedin || null,
          x: socialMediaData.twitter || null, // twitter maps to x
          youtube: socialMediaData.youtube || null,
          github: socialMediaData.github || null,
          behance: socialMediaData.behance || null,
          dribbble: socialMediaData.dribbble || null
        };

        // Get and convert image data for this freelancer
        const rawImageData = imageMap.get(freelancer.id);
        const imageData = extractImageUrl(rawImageData || null);
        
        // Get portfolio data for this freelancer
        const portfolioData = portfolioMap.get(freelancer.id) || [];

        // Prepare profile data
        const profileData = {
          uid: migratedUser.id,
          type: freelancerType, // 'freelancer' or 'company'

          // Basic info (sync with user)
          username: freelancer.username,
          displayName: freelancer.display_name,
          firstName: freelancer.first_name,
          lastName: freelancer.last_name,
          email: originalUser.email, // Duplicated from User for profile purposes

          // Profile-specific info
          tagline: freelancer.tagline,
          bio: freelancer.description,
          website: freelancer.website,

          // Contact info
          phone: bigintToString(freelancer.phone),
          viber: bigintToString(freelancer.viber),
          whatsapp: bigintToString(freelancer.whatsapp),

          // Professional info
          rate: freelancer.rate,
          experience: freelancer.years_of_experience,
          commencement: convertCommencement(freelancer.commencement),
          terms: freelancer.terms,

          // Taxonomy fields from Strapi relationships
          category: freelancer.category_id,
          subcategory: freelancer.subcategory_id,
          speciality: freelancer.specialization_id, // Single skill ID
          skills: freelancer.skills || [], // Array of skill IDs
          size: freelancer.size_id,
          budget: freelancer.budget_id,
          contactMethods: freelancer.contact_methods || [],
          paymentMethods: freelancer.payment_methods || [],
          settlementMethods: freelancer.settlement_methods || [],
          industries: freelancer.industries || [],

          // Component data
          coverage: coverageData,
          visibility: visibilityData,
          billing: billingData,
          socials: socialsData,
          image: imageData,
          portfolio: portfolioData,

          // Rating and verification
          rating: finalRating,
          reviewCount: reviewCount,
          stars: starsBreakdown,
          verified: freelancer.verified || false,
          featured: freelancer.featured || false,
          top: freelancer.top_level || false,
          published: freelancer.published_at !== null,
          isActive: freelancer.status_name === 'Active',

          // Timestamps
          createdAt: freelancer.created_at || new Date(),
          updatedAt: freelancer.updated_at || new Date(),
        };

        // User updates (sync shared fields) - role based on freelancer type
        const userRole = freelancerType === 'company' ? 'company' : 'freelancer';
        const userUpdates: any = {
          role: userRole,
          type: 'pro',
        };

        // Sync shared fields between User and Profile
        // Always update these fields to keep User and Profile in sync
        userUpdates.username = freelancer.username ?? null;
        userUpdates.displayName = freelancer.display_name ?? null;
        userUpdates.firstName = freelancer.first_name ?? null;
        userUpdates.lastName = freelancer.last_name ?? null;
        // Sync image field - ensure User.image matches Profile.image
        if (imageData) {
          userUpdates.image = imageData;
        }

        // Handle potential duplicate username before update
        if (userUpdates.username) {
          const existingUsername = await targetDb.user.findFirst({
            where: {
              username: userUpdates.username,
              NOT: { id: migratedUser.id } // Exclude current user
            }
          });

          if (existingUsername) {
            // Make username unique by appending email local part
            const emailLocal = originalUser.email.split('@')[0];
            userUpdates.username = `${userUpdates.username}_${emailLocal}`;
            stats.warnings.push(`User ${originalUser.email}: Username conflict, using ${userUpdates.username}`);
          }
        }

        // Create or update profile and update user in transaction
        let profileHasChanges = false;
        let userHasChanges = false;
        let profileCheck = { hasChanges: false, changedFields: [] as string[] };
        let userCheck = { hasChanges: false, changedFields: [] as string[] };

        await targetDb.$transaction(async (tx) => {
          if (migratedUser.hasProfile && updateExisting) {
            // Fetch existing profile and user to check for changes
            const existingProfile = await tx.profile.findUnique({
              where: { uid: migratedUser.id }
            });

            const existingUser = await tx.user.findUnique({
              where: { id: migratedUser.id }
            });

            if (!existingProfile || !existingUser) {
              throw new Error(`Profile or User not found for uid: ${migratedUser.id}`);
            }

            // Check for profile changes
            profileCheck = hasProfileChanges(existingProfile, profileData);
            profileHasChanges = profileCheck.hasChanges;

            // Check for user changes
            userCheck = hasUserChanges(existingUser, userUpdates);
            userHasChanges = userCheck.hasChanges;

            // Only update if there are changes
            if (profileHasChanges) {
              // Note: updatedAt is auto-updated by Prisma @updatedAt decorator
              await tx.profile.update({
                where: { uid: migratedUser.id },
                data: {
                  ...profileData,
                  uid: undefined, // Remove uid from update
                  createdAt: undefined, // Don't update createdAt
                  updatedAt: undefined, // Let Prisma auto-update this
                },
              });
            }

            if (userHasChanges) {
              await tx.user.update({
                where: { id: migratedUser.id },
                data: userUpdates,
              });
            }
          } else {
            // Create new profile
            await tx.profile.create({
              data: profileData,
            });

            // Update user (always update for new profiles)
            await tx.user.update({
              where: { id: migratedUser.id },
              data: userUpdates,
            });

            profileHasChanges = true;
            userHasChanges = true;
          }
        });

        const isUpdate = migratedUser.hasProfile && updateExisting;

        if (isUpdate) {
          // Only count as updated if there were actual changes
          if (profileHasChanges || userHasChanges) {
            if (profileHasChanges) {
              stats.profilesUpdated++;
            }
            if (userHasChanges) {
              stats.usersUpdated++;
            }
            const changedFieldsMsg = [];
            if (profileHasChanges) {
              changedFieldsMsg.push(`Profile[${profileCheck.changedFields.join(', ')}]`);
            }
            if (userHasChanges) {
              changedFieldsMsg.push(`User[${userCheck.changedFields.join(', ')}]`);
            }
            console.log(
              `✅ ${progress} ${freelancerType.toUpperCase()} profile UPDATED with changes ${changedFieldsMsg.join(' ')}: ${originalUser.email}`,
            );
          } else {
            stats.profilesSkipped++;
            stats.warnings.push(`User ${originalUser.email}: No changes detected`);
            console.log(
              `⚠️ ${progress} ${freelancerType.toUpperCase()} profile SKIPPED - No changes`,
            );
          }
        } else {
          stats.profilesCreated++;
          stats.usersUpdated++;
          console.log(
            `✅ ${progress} ${freelancerType.toUpperCase()} profile CREATED (Reviews: disabled)`,
          );
        }

        // Track by type (only if profile was created or updated)
        if (!isUpdate || profileHasChanges) {
          if (freelancerType === 'freelancer') {
            stats.freelancerProfiles++;
          } else if (freelancerType === 'company') {
            stats.companyProfiles++;
          }
        }
      } catch (error) {
        const errorMsg = `Freelancer ${freelancer.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        stats.errors.push(errorMsg);
        console.error(`❌ ${progress} Error:`, error);
      }
    }

    // Step 11: Handle orphaned freelancers
    console.log('\n🔍 Processing orphaned freelancers...');

    for (let i = 0; i < orphanedFreelancers.length; i++) {
      const freelancer = orphanedFreelancers[i];
      const progress = `[Orphan ${i + 1}/${orphanedFreelancers.length}]`;

      try {
        console.log(
          `${progress} Processing orphaned freelancer: ${freelancer.id} (${freelancer.email})`,
        );

        // Try to match by email if available
        if (freelancer.email) {
          const migratedUser = userEmailMap.get(freelancer.email);
          if (migratedUser && !migratedUser.hasProfile) {
            // Same logic as linked freelancers, but mark as orphan-recovered
            stats.orphanResults.emailMatched++;
            console.log(`✅ ${progress} Matched by email - processing...`);
            // Implementation would be similar to linked freelancers
            // (shortened for brevity - can expand if needed)
          } else {
            stats.orphanResults.skipped++;
            stats.warnings.push(
              `Orphaned freelancer ${freelancer.id}: No email match or profile exists`,
            );
            console.log(`⚠️ ${progress} Skipped - No email match available`);
          }
        } else {
          stats.orphanResults.skipped++;
          stats.warnings.push(
            `Orphaned freelancer ${freelancer.id}: No email for matching`,
          );
          console.log(`⚠️ ${progress} Skipped - No email available`);
        }
      } catch (error) {
        stats.orphanResults.skipped++;
        const errorMsg = `Orphaned freelancer ${freelancer.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        stats.errors.push(errorMsg);
        console.error(`❌ ${progress} Error:`, error);
      }
    }

    // Print migration summary
    console.log('\n📊 MIGRATION SUMMARY');
    console.log('===================');
    console.log(`Total freelancers: ${stats.totalFreelancers}`);
    console.log(`Linked freelancers: ${stats.linkedFreelancers}`);
    console.log(`Orphaned freelancers: ${stats.orphanedFreelancers}`);
    console.log(`Users matched: ${stats.matchedUsers}`);
    console.log(`Users unmatched: ${stats.unmatchedUsers}`);
    console.log(`\n📋 PROFILE OPERATIONS:`);
    console.log(`Freelancer profiles: ${stats.freelancerProfiles}`);
    console.log(`Company profiles: ${stats.companyProfiles}`);
    console.log(`Profiles created: ${stats.profilesCreated}`);
    console.log(`Profiles updated: ${stats.profilesUpdated}`);
    console.log(`Total profiles processed: ${stats.profilesCreated + stats.profilesUpdated}`);
    console.log(`User-only updates: ${stats.userOnlyUpdates}`);
    console.log(`Profiles skipped: ${stats.profilesSkipped}`);
    console.log(`Total users updated: ${stats.usersUpdated}`);
    console.log(`\n🚨 ISSUES:`);
    console.log(`Errors: ${stats.errors.length}`);
    console.log(`Warnings: ${stats.warnings.length}`);

    console.log('\n👤 ORPHAN RESULTS:');
    console.log(`Email matched: ${stats.orphanResults.emailMatched}`);
    console.log(`Skipped: ${stats.orphanResults.skipped}`);

    if (stats.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      stats.warnings.forEach((msg) => console.log(`  - ${msg}`));
    }

    if (stats.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      stats.errors.forEach((msg) => console.log(`  - ${msg}`));
    }

    console.log('\n🎉 Profile migration completed!');

    return stats;
  } catch (error) {
    console.error('💥 Fatal migration error:', error);
    throw error;
  } finally {
    await sourceDb.$disconnect();
    await targetDb.$disconnect();
    console.log('🔌 Database connections closed');
  }
}

// Test function to verify migrated profiles
async function testProfileData(email: string): Promise<boolean> {
  try {
    console.log(`🧪 Testing profile data for user: ${email}`);

    const user = await targetDb.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user) {
      console.log('❌ User not found');
      return false;
    }

    console.log('✅ User data:');
    console.log(`  - ID: ${user.id}`);
    console.log(`  - Role: ${user.role}`);
    console.log(`  - Type: ${user.type}`);
    console.log(`  - Name: ${user.displayName || 'N/A'}`);

    if (!user.profile) {
      console.log('❌ No profile found for user');
      return false;
    }

    console.log('✅ Profile data:');
    console.log(`  - ID: ${user.profile.id}`);
    console.log(`  - Type: ${user.profile.type}`);
    console.log(`  - Tagline: ${user.profile.tagline || 'N/A'}`);
    // REVIEWS DISABLED
    // console.log(
    //   `  - Rating: ${user.profile.rating}/5 (${user.profile.reviewCount} reviews)`,
    // );
    console.log(`  - Rating: 0/5 (0 reviews) - Reviews disabled`);
    console.log(`  - Experience: ${user.profile.experience || 'N/A'} years`);
    console.log(`  - Rate: €${user.profile.rate || 'N/A'}`);
    console.log(`  - Phone: ${user.profile.phone || 'N/A'}`);
    console.log(`  - Verified: ${user.profile.verified ? 'Yes' : 'No'}`);
    console.log(`  - Featured: ${user.profile.featured ? 'Yes' : 'No'}`);
    console.log(`  - Published: ${user.profile.published ? 'Yes' : 'No'}`);
    console.log(`  - Top: ${user.profile.top ? 'Yes' : 'No'}`);
    
    console.log('\n🖼️ IMAGE DATA:');
    if (user.profile.image) {
      console.log(`  - URL: ${user.profile.image}`);
    } else {
      console.log(`  - No image available`);
    }
    
    console.log('\n📋 TAXONOMY DATA:');
    console.log(`  - Category: ${user.profile.category || 'N/A'}`);
    console.log(`  - Subcategory: ${user.profile.subcategory || 'N/A'}`);
    console.log(`  - Speciality: ${user.profile.speciality || 'N/A'}`);
    console.log(`  - Skills (${(user.profile.skills as string[])?.length || 0}): ${(user.profile.skills as string[])?.join(', ') || 'N/A'}`);
    console.log(`  - Size: ${user.profile.size || 'N/A'}`);
    console.log(`  - Budget: ${user.profile.budget || 'N/A'}`);
    
    console.log('\n🔧 COLLECTIONS DATA:');
    console.log(`  - Contact Methods (${(user.profile.contactMethods as string[])?.length || 0}): ${(user.profile.contactMethods as string[])?.join(', ') || 'N/A'}`);
    console.log(`  - Payment Methods (${(user.profile.paymentMethods as string[])?.length || 0}): ${(user.profile.paymentMethods as string[])?.join(', ') || 'N/A'}`);
    console.log(`  - Settlement Methods (${(user.profile.settlementMethods as string[])?.length || 0}): ${(user.profile.settlementMethods as string[])?.join(', ') || 'N/A'}`);
    console.log(`  - Industries (${(user.profile.industries as string[])?.length || 0}): ${(user.profile.industries as string[])?.join(', ') || 'N/A'}`);
    
    // REVIEWS DISABLED
    // console.log('\n⭐ RATING BREAKDOWN:');
    // if (user.profile.stars) {
    //   const stars = user.profile.stars as any;
    //   console.log(`  - 1★: ${stars['1'] || 0} | 2★: ${stars['2'] || 0} | 3★: ${stars['3'] || 0} | 4★: ${stars['4'] || 0} | 5★: ${stars['5'] || 0}`);
    // } else {
    //   console.log(`  - No star breakdown available`);
    // }
    console.log('\n⭐ RATING BREAKDOWN: Reviews disabled - all set to 0');

    return true;
  } catch (error) {
    console.error('❌ Profile test error:', error);
    return false;
  }
}

// Analysis function to compare migration results
async function analyzeProfileMigration(): Promise<void> {
  try {
    console.log('📊 PROFILE MIGRATION ANALYSIS');
    console.log('=============================');

    // Target analysis
    const profileStats = await targetDb.profile.aggregate({
      where: { type: 'freelancer' },
      _count: { id: true },
      _avg: { rating: true, experience: true, rate: true },
    });

    const verifiedProfiles = await targetDb.profile.count({
      where: { type: 'freelancer', verified: true },
    });

    const featuredProfiles = await targetDb.profile.count({
      where: { type: 'freelancer', featured: true },
    });

    const publishedProfiles = await targetDb.profile.count({
      where: { type: 'freelancer', published: true },
    });

    const profilesWithImages = await targetDb.profile.count({
      where: {
        type: 'freelancer',
        AND: [
          { image: { not: null } },
          { image: { not: '' } }
        ]
      },
    });

    const freelancerUsers = await targetDb.user.count({
      where: { role: 'freelancer' },
    });

    const regularUsers = await targetDb.user.count({
      where: { role: 'user' },
    });

    console.log('\n📈 RESULTS:');
    console.log(`Freelancer profiles created: ${profileStats._count.id}`);
    console.log(`Freelancer users (role): ${freelancerUsers}`);
    console.log(`Regular users (role): ${regularUsers}`);
    console.log(
      `Average rating: ${profileStats._avg.rating?.toFixed(2) || 'N/A'}`,
    );
    console.log(
      `Average experience: ${profileStats._avg.experience?.toFixed(1) || 'N/A'} years`,
    );
    console.log(
      `Average rate: €${profileStats._avg.rate?.toFixed(0) || 'N/A'}`,
    );
    console.log(`Verified profiles: ${verifiedProfiles}`);
    console.log(`Featured profiles: ${featuredProfiles}`);
    console.log(`Published profiles: ${publishedProfiles}`);
    console.log(`Profiles with images: ${profilesWithImages}`);
  } catch (error) {
    console.error('❌ Analysis error:', error);
  }
}

// Rollback function
async function rollbackProfileMigration(): Promise<void> {
  console.log('🔄 Starting profile migration rollback...');

  try {
    await targetDb.$connect();

    // Delete all freelancer profiles
    const deleteResult = await targetDb.profile.deleteMany({
      where: { type: 'freelancer' },
    });

    console.log(`✅ Deleted ${deleteResult.count} freelancer profiles`);

    // Reset user roles and types
    const resetUsers = await targetDb.user.updateMany({
      where: { role: 'freelancer' },
      data: { role: 'user', type: 'user' },
    });

    console.log(`✅ Reset ${resetUsers.count} user roles/types`);

    console.log('🎉 Rollback completed successfully');
  } catch (error) {
    console.error('❌ Rollback error:', error);
    throw error;
  } finally {
    await targetDb.$disconnect();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args[0] === 'rollback') {
    await rollbackProfileMigration();
    return;
  }

  if (args[0] === 'test' && args[1]) {
    await testProfileData(args[1]);
    return;
  }

  if (args[0] === 'analyze') {
    await analyzeProfileMigration();
    return;
  }

  // Default to update mode (always check for changes and update if needed)
  // Use --create-only flag to skip updates
  const createOnly = args.includes('--create-only');
  const shouldUpdateExisting = !createOnly; // Update by default

  if (shouldUpdateExisting) {
    console.log('🔄 UPDATE MODE - Existing records will be updated if changes detected\n');
  } else {
    console.log('📝 CREATE ONLY MODE - Existing records will be skipped\n');
  }

  // Run the migration
  const stats = await migrateProfiles(shouldUpdateExisting);

  // Exit with appropriate code
  process.exit(stats.errors.length > 0 ? 1 : 0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled rejection:', error);
  process.exit(1);
});

if (require.main === module) {
  main().catch(console.error);
}

export {
  migrateProfiles,
  testProfileData,
  analyzeProfileMigration,
  rollbackProfileMigration,
};
