/**
 * SERVICE MIGRATION SCRIPT - Strapi Services to Better-Auth Services
 *
 * Migrates services from DigitalOcean PostgreSQL (Strapi) to Neon PostgreSQL (Better-Auth)
 *
 * DATA ANALYSIS:
 * - Total services: 315
 * - Services with freelancers: 252 (63 orphaned services)  
 * - Unique freelancers: 103
 * - Status distribution: Active (224), Pending (82), Canceled (9)
 *
 * SIMPLIFIED FIELD MAPPING (No Packages, No Location):
 *
 * Strapi services → Better-Auth Service
 * ├── id → id (converted to CUID)
 * ├── title → title + titleNormalized (accent-insensitive search)
 * ├── description → description + descriptionNormalized (accent-insensitive search)
 * ├── price → price
 * ├── time → duration (days)
 * ├── fixed → fixed
 * // REVIEWS DISABLED - NOT MIGRATING YET
 * // ├── rating → rating
 * // ├── reviews_total → reviewCount
 * ├── featured → featured
 * ├── created_at → createdAt
 * ├── updated_at → updatedAt
 * ├── services_status_links → status (Active/Pending/Canceled)
 * ├── subscription_type → subscriptionType
 * 
 * ├── services_category_links → category (taxonomy ID)
 * ├── services_subcategory_links → subcategory (taxonomy ID)
 * ├── services_subdivision_links → subdivision (taxonomy ID)
 * ├── tags_services_links → tags[] (array of tag IDs)
 * 
 * ├── components_service_types → type JSON {online, presence, oneoff, onbase, subscription, onsite}
 * ├── components_pricing_addons → addons[] JSON [{title, description, price}]
 * ├── components_pricing_faqs → faq[] JSON [{question, answer}]
 * ├── files_related_morphs → media JSON (Cloudinary resources)
 * 
 * └── services_freelancer_links → pid (Profile ID via freelancer→user→email→profile)
 *
 * MIGRATION STRATEGY:
 * 1. Load service → freelancer mappings
 * 2. Load all services with components and taxonomies
 * 3. Match each service to migrated profile via freelancer→user→email chain
 * 4. Create Service record with JSON components
 * 5. Handle orphaned services with email fallback
 */

import { PrismaClient as SourcePrismaClient } from '@prisma/client';
import { PrismaClient as TargetPrismaClient, SubscriptionType, Status } from '@prisma/client';
import { normalizeTerm } from '../src/lib/utils/text/normalize';

// Types for source database (Strapi)
interface StrapiService {
  id: number;
  created_at: Date | null;
  updated_at: Date | null;
  published_at: Date | null;
  created_by_id: number | null;
  updated_by_id: number | null;
  title: string | null;
  description: string | null;
  price: number | null;
  time: number | null;
  fixed: boolean | null;
  // REVIEWS DISABLED - NOT MIGRATING YET
  // rating: number | null;
  slug: string | null;
  // reviews_total: bigint | null;
  featured: boolean | null;
  subscription_type: string | null;
}

interface StrapiServiceWithRelations extends StrapiService {
  freelancer_id: number | null;
  status_type: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  subdivision_id: string | null;
  tags: string[]; // Array of tag IDs
  // Component data
  service_type_data: any | null;
  addons_data: any[] | null;
  faq_data: any[] | null;
  media_data: StrapiFile[] | null;
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

interface StrapiUser {
  id: number;
  email: string;
  username: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
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
  totalServices: number;
  servicesWithFreelancers: number;
  orphanedServices: number;
  matchedProfiles: number;
  unmatchedProfiles: number;
  servicesCreated: number;
  servicesUpdated: number;
  servicesSkipped: number;
  errors: string[];
  warnings: string[];
  orphanResults: {
    emailMatched: number;
    skipped: number;
  };
  statusDistribution: {
    [key: string]: number;
  };
}

// Helper function to convert bigint to number safely
function bigintToNumber(value: bigint | null): number {
  if (value === null || value === BigInt(0)) return 0;
  return Number(value);
}

// Helper function to map Strapi status to Better-Auth status
function mapStatus(strapiStatus: string | null): Status {
  if (!strapiStatus) return Status.draft;

  switch (strapiStatus.toLowerCase()) {
    case 'active':
      return Status.published;
    case 'pending':
      return Status.pending;
    case 'canceled':
    case 'cancelled':
      return Status.rejected;
    case 'ongoing':
    case 'completed':
      return Status.published;
    default:
      return Status.draft;
  }
}

// Helper function to map Strapi subscription type to Prisma SubscriptionType enum
function mapSubscriptionType(strapiSubscriptionType: string | null): SubscriptionType | null {
  if (!strapiSubscriptionType) return null;

  const normalizedType = strapiSubscriptionType.toLowerCase().trim();

  switch (normalizedType) {
    case 'month':
    case 'monthly':
      return SubscriptionType.month;
    case 'year':
    case 'yearly':
    case 'annual':
      return SubscriptionType.year;
    case 'per_case':
    case 'per-case':
    case 'case':
      return SubscriptionType.per_case;
    case 'per_hour':
    case 'per-hour':
    case 'hour':
    case 'hourly':
      return SubscriptionType.per_hour;
    case 'per_session':
    case 'per-session':
    case 'session':
      return SubscriptionType.per_session;
    default:
      console.warn(`Unknown subscription type: "${strapiSubscriptionType}" - will be set to null`);
      return null;
  }
}

// Helper function to process service type component
function processServiceType(serviceTypeData: any): any {
  if (!serviceTypeData) {
    return {
      presence: false,
      online: false,
      oneoff: true,
      onbase: false,
      subscription: false,
      onsite: false
    };
  }

  try {
    const data = typeof serviceTypeData === 'string' ? JSON.parse(serviceTypeData) : serviceTypeData;
    return {
      presence: data.presence || false,
      online: data.online || false,
      oneoff: data.oneoff || true,
      onbase: data.onbase || false,
      subscription: data.subscription || false,
      onsite: data.onsite || false
    };
  } catch (error) {
    console.warn('Failed to process service type data:', error);
    return {
      presence: false,
      online: false,
      oneoff: true,
      onbase: false,
      subscription: false,
      onsite: false
    };
  }
}

// Helper function to process addons
function processAddons(addonsData: any[]): any[] {
  if (!addonsData || !Array.isArray(addonsData)) return [];

  return addonsData.map(addon => ({
    title: addon.title || '',
    description: addon.description || '',
    price: addon.price || 0
  }));
}

// Helper function to process FAQ
function processFaq(faqData: any[]): any[] {
  if (!faqData || !Array.isArray(faqData)) return [];

  return faqData.map(faq => ({
    question: faq.question || '',
    answer: faq.answer || ''
  }));
}

// Helper function to process media files to Cloudinary format
// Service schema expects Json? with Media type (array of CloudinaryResource)
function processMediaFiles(mediaFiles: StrapiFile[]): any | null {
  if (!mediaFiles || !Array.isArray(mediaFiles) || mediaFiles.length === 0) return null;

  const processedFiles = mediaFiles.map(file => {
    // Determine resource type based on MIME type
    let resourceType: 'image' | 'video' | 'raw' | 'audio' | 'auto' = 'raw';
    const mimeType = file.mime || '';
    const ext = file.ext ? file.ext.toLowerCase() : '';
    
    if (mimeType.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'].includes(ext)) {
      resourceType = 'image';
    } else if (mimeType.startsWith('video/') || ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm', '.m4v'].includes(ext)) {
      resourceType = 'video';
    } else if (mimeType.startsWith('audio/') || ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma'].includes(ext)) {
      resourceType = 'audio';
    }
    
    // Convert Strapi file to CloudinaryResource format (same pattern as profile migration)
    return {
      public_id: file.hash || '',
      secure_url: file.url || '',
      width: file.width || undefined,
      height: file.height || undefined,
      resource_type: resourceType,
      format: file.ext ? file.ext.replace('.', '') : undefined,
      // Convert size from KB (Strapi) to bytes (Cloudinary)
      bytes: file.size ? Math.round(file.size * 1024) : undefined,
      url: file.url || '',
      original_filename: file.name || undefined,
    };
  });

  // Return array of CloudinaryResource objects (Media type)
  return processedFiles;
}

// Helper function to fetch service components
async function fetchServiceComponents(serviceIds: number[]): Promise<Map<number, any>> {
  const componentMap = new Map();
  
  if (serviceIds.length === 0) return componentMap;

  try {
    // Fetch service type components
    const serviceTypes = await sourceDb.$queryRawUnsafe(`
      SELECT 
        sc.entity_id as service_id,
        st.*
      FROM services_components sc
      JOIN components_service_types st ON sc.component_id = st.id
      WHERE sc.component_type = 'service.type'
        AND sc.entity_id = ANY(ARRAY[${serviceIds.join(',')}])
    `) as any[];

    // Fetch pricing addons
    const addons = await sourceDb.$queryRawUnsafe(`
      SELECT 
        sc.entity_id as service_id,
        pa.*
      FROM services_components sc
      JOIN components_pricing_addons pa ON sc.component_id = pa.id
      WHERE sc.component_type = 'pricing.addon'
        AND sc.entity_id = ANY(ARRAY[${serviceIds.join(',')}])
      ORDER BY sc.entity_id, sc.order
    `) as any[];

    // Fetch FAQ components
    const faqs = await sourceDb.$queryRawUnsafe(`
      SELECT 
        sc.entity_id as service_id,
        pf.*
      FROM services_components sc
      JOIN components_pricing_faqs pf ON sc.component_id = pf.id
      WHERE sc.component_type = 'pricing.faq'
        AND sc.entity_id = ANY(ARRAY[${serviceIds.join(',')}])
      ORDER BY sc.entity_id, sc.order
    `) as any[];

    // Initialize component map
    serviceIds.forEach(serviceId => {
      componentMap.set(serviceId, {
        service_type_data: null,
        addons_data: [],
        faq_data: []
      });
    });

    // Group service types
    serviceTypes.forEach(type => {
      const components = componentMap.get(type.service_id);
      if (components) {
        components.service_type_data = type;
      }
    });

    // Group addons
    addons.forEach(addon => {
      const components = componentMap.get(addon.service_id);
      if (components) {
        components.addons_data.push(addon);
      }
    });

    // Group FAQs
    faqs.forEach(faq => {
      const components = componentMap.get(faq.service_id);
      if (components) {
        components.faq_data.push(faq);
      }
    });

    return componentMap;
  } catch (error) {
    console.warn('Failed to fetch service components:', error);
    return componentMap;
  }
}

// Helper function to fetch service media
async function fetchServiceMedia(serviceIds: number[]): Promise<Map<number, StrapiFile[]>> {
  const mediaMap = new Map();
  
  if (serviceIds.length === 0) return mediaMap;

  try {
    const serviceMedia = await sourceDb.$queryRawUnsafe(`
      SELECT 
        frm.related_id as service_id,
        f.*
      FROM files_related_morphs frm
      JOIN files f ON frm.file_id = f.id
      WHERE frm.related_type = 'api::service.service'
        AND frm.field = 'media'
        AND frm.related_id = ANY(ARRAY[${serviceIds.join(',')}])
      ORDER BY frm.related_id, frm.order
    `) as any[];

    // Group media by service ID
    serviceMedia.forEach(media => {
      if (!mediaMap.has(media.service_id)) {
        mediaMap.set(media.service_id, []);
      }
      mediaMap.get(media.service_id).push(media);
    });

    return mediaMap;
  } catch (error) {
    console.warn('Failed to fetch service media:', error);
    return mediaMap;
  }
}

// Helper function to detect service data changes
function hasServiceChanges(existingService: any, newData: any): {hasChanges: boolean, changedFields: string[]} {
  const changedFields: string[] = [];

  // Helper to compare values (handles null/undefined and objects)
  const isDifferent = (oldVal: any, newVal: any): boolean => {
    const normalizedOld = oldVal === undefined ? null : oldVal;
    const normalizedNew = newVal === undefined ? null : newVal;

    // Handle number comparison with float precision tolerance
    if (typeof normalizedOld === 'number' && typeof normalizedNew === 'number') {
      // Use epsilon for float comparison (handles precision differences)
      return Math.abs(normalizedOld - normalizedNew) > 0.0001;
    }

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

  // Check all service fields (excluding id, pid, createdAt, updatedAt)
  const fieldsToCheck = [
    'slug', 'title', 'titleNormalized', 'description', 'descriptionNormalized',
    'category', 'subcategory', 'subdivision', 'tags',
    'fixed', 'price', 'type', 'subscriptionType', 'duration',
    'addons', 'faq', 'media', 'featured',
    // REVIEWS DISABLED - NOT CHECKING FOR CHANGES
    // 'rating', 'reviewCount',
    'status'
  ];

  for (const field of fieldsToCheck) {
    if (isDifferent(existingService[field], newData[field])) {
      changedFields.push(field);
    }
  }

  return {
    hasChanges: changedFields.length > 0,
    changedFields
  };
}

// Main migration function
async function migrateServices(updateExisting: boolean = false): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalServices: 0,
    servicesWithFreelancers: 0,
    orphanedServices: 0,
    matchedProfiles: 0,
    unmatchedProfiles: 0,
    servicesCreated: 0,
    servicesUpdated: 0,
    servicesSkipped: 0,
    errors: [],
    warnings: [],
    orphanResults: {
      emailMatched: 0,
      skipped: 0,
    },
    statusDistribution: {},
  };

  try {
    console.log('🚀 Starting service migration from Strapi to Better-Auth...');
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

    // Step 2: Load all services with relationships and components
    console.log('📥 Loading services with complete data from Strapi...');

    const strapiServices = await sourceDb.$queryRawUnsafe(`
      SELECT 
        s.*,
        sfl.freelancer_id,
        st.type as status_type,
        
        -- Single taxonomy relationships
        scl.category_id::text as category_id,
        sscl.subcategory_id::text as subcategory_id,
        ssdl.subdivision_id::text as subdivision_id,
        
        -- Tags array
        COALESCE(
          ARRAY_AGG(DISTINCT tsl.tag_id::text) FILTER (WHERE tsl.tag_id IS NOT NULL),
          ARRAY[]::text[]
        ) as tags
        
      FROM services s
      
      -- Freelancer relationship
      LEFT JOIN services_freelancer_links sfl ON s.id = sfl.service_id
      
      -- Status relationship
      LEFT JOIN services_status_links ssl ON s.id = ssl.service_id
      LEFT JOIN statuses st ON ssl.status_id = st.id
      
      -- Taxonomy relationships
      LEFT JOIN services_category_links scl ON s.id = scl.service_id
      LEFT JOIN services_subcategory_links sscl ON s.id = sscl.service_id
      LEFT JOIN services_subdivision_links ssdl ON s.id = ssdl.service_id
      
      -- Tags
      LEFT JOIN tags_services_links tsl ON s.id = tsl.service_id
      
      GROUP BY s.id, sfl.freelancer_id, st.type, scl.category_id, sscl.subcategory_id, ssdl.subdivision_id
      ORDER BY s.created_at ASC
    `) as StrapiServiceWithRelations[];

    stats.totalServices = strapiServices.length;
    console.log(`📊 Found ${stats.totalServices} total services`);

    // Load component data for all services
    console.log('📥 Loading service components...');
    const serviceIds = strapiServices.map(s => s.id);
    const componentDataMap = await fetchServiceComponents(serviceIds);
    console.log(`📊 Loaded components for ${componentDataMap.size} services`);

    // Load media data for all services
    console.log('📥 Loading service media...');
    const mediaDataMap = await fetchServiceMedia(serviceIds);
    console.log(`📊 Loaded media for ${mediaDataMap.size} services`);

    // Step 3: Load users and profiles for matching
    console.log('📥 Loading users and profiles...');

    const strapiUsers = await sourceDb.$queryRaw<StrapiUser[]>`
      SELECT id, email, username, display_name, first_name, last_name 
      FROM up_users ORDER BY id
    `;

    const strapiUserMap = new Map(strapiUsers.map((user) => [user.id, user]));
    console.log(`📊 Loaded ${strapiUsers.length} Strapi users`);

    // Load migrated profiles
    const migratedProfiles = await targetDb.profile.findMany({
      select: {
        id: true,
        uid: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    const profileEmailMap = new Map(
      migratedProfiles.map((profile) => [
        profile.user.email,
        profile.id,
      ]),
    );

    console.log(`📊 Loaded ${migratedProfiles.length} migrated profiles`);

    // Step 4: Create lookup maps
    const linkMap = new Map(
      freelancerUserLinks.map((link) => [link.freelancer_id, link.user_id]),
    );

    // Separate services with and without freelancers
    const servicesWithFreelancers = strapiServices.filter((s) => s.freelancer_id);
    const orphanedServices = strapiServices.filter((s) => !s.freelancer_id);

    stats.servicesWithFreelancers = servicesWithFreelancers.length;
    stats.orphanedServices = orphanedServices.length;

    console.log(`📊 Services with freelancers: ${stats.servicesWithFreelancers}`);
    console.log(`📊 Orphaned services: ${stats.orphanedServices}`);

    // Step 5: Process services with freelancers
    console.log('\n🔗 Processing services with freelancers...');

    for (let i = 0; i < servicesWithFreelancers.length; i++) {
      const service = servicesWithFreelancers[i];
      const progress = `[${i + 1}/${servicesWithFreelancers.length}]`;

      try {
        const originalUserId = linkMap.get(service.freelancer_id!);
        if (!originalUserId) {
          stats.errors.push(
            `Service ID ${service.id}: No user link found for freelancer ${service.freelancer_id}`,
          );
          continue;
        }

        const originalUser = strapiUserMap.get(originalUserId);
        if (!originalUser) {
          stats.errors.push(
            `Service ID ${service.id}: Original user ${originalUserId} not found`,
          );
          continue;
        }

        console.log(
          `${progress} Processing service: ${service.id} → ${originalUser.email}`,
        );

        // Find migrated profile by email
        const profileId = profileEmailMap.get(originalUser.email);
        if (!profileId) {
          stats.unmatchedProfiles++;
          stats.errors.push(
            `Service ${service.id}: No migrated profile found for ${originalUser.email}`,
          );
          console.log(`❌ ${progress} Error - No migrated profile found`);
          continue;
        }

        stats.matchedProfiles++;

        // Check if service already exists by ID only
        const existingService = await targetDb.service.findFirst({
          where: { id: service.id }, // Check by exact ID only
        });

        if (existingService && !updateExisting) {
          stats.servicesSkipped++;
          stats.warnings.push(
            `Service ${service.id}: Already exists`,
          );
          console.log(`⚠️ ${progress} Skipped - Service already exists`);
          continue;
        }

        // Get component data
        const components = componentDataMap.get(service.id) || {
          service_type_data: null,
          addons_data: [],
          faq_data: []
        };

        const mediaFiles = mediaDataMap.get(service.id) || [];

        // Process component data
        const serviceType = processServiceType(components.service_type_data);
        const addons = processAddons(components.addons_data);
        const faq = processFaq(components.faq_data);
        const media = processMediaFiles(mediaFiles);

        // Map status and subscription type
        const mappedStatus = mapStatus(service.status_type);
        const mappedSubscriptionType = mapSubscriptionType(service.subscription_type);

        // Track subscription type mapping issues
        if (service.subscription_type && !mappedSubscriptionType) {
          stats.warnings.push(
            `Service ${service.id}: Invalid subscription type "${service.subscription_type}" mapped to null`
          );
        }

        stats.statusDistribution[mappedStatus] = (stats.statusDistribution[mappedStatus] || 0) + 1;

        // Prepare service data (use raw Strapi values for comparison)
        const title = service.title ?? 'Untitled Service';
        const description = service.description ?? '';

        const serviceData = {
          id: service.id,
          pid: profileId,
          slug: service.slug ?? `service-${service.id}`,
          title: title,
          titleNormalized: normalizeTerm(title),
          description: description,
          descriptionNormalized: normalizeTerm(description),

          // Taxonomies (all required, use empty string instead of null)
          category: service.category_id ?? '',
          subcategory: service.subcategory_id ?? '',
          subdivision: service.subdivision_id ?? '',
          tags: service.tags ?? [],

          // Pricing
          fixed: service.fixed ?? true,
          price: service.price ?? 0,
          type: serviceType,
          subscriptionType: mappedSubscriptionType,
          duration: service.time ?? 0,

          // Features
          addons: addons,
          faq: faq,

          // Media
          media: media,

          // Misc
          featured: service.featured ?? false,

          // REVIEWS DISABLED - SET DEFAULT VALUES (NOT MIGRATING REVIEWS YET)
          // Reviews and Rating
          // rating: service.rating ? Number(service.rating) : 0,
          // reviewCount: bigintToNumber(service.reviews_total) ?? 0,
          rating: 0,
          reviewCount: 0,

          status: mappedStatus,
          createdAt: service.created_at ?? new Date(),
          updatedAt: service.updated_at ?? new Date(),
        };

        // Create or update service
        if (existingService && updateExisting) {
          // Check for actual changes
          // Exclude id, pid (foreign key), createdAt, updatedAt from updates
          const { id, pid, createdAt, updatedAt, ...dataWithoutMeta } = serviceData;
          const changeCheck = hasServiceChanges(existingService, dataWithoutMeta);

          if (changeCheck.hasChanges) {
            // Only update if there are actual changes
            // Note: updatedAt is auto-updated by Prisma @updatedAt decorator
            await targetDb.service.update({
              where: { id: existingService.id },
              data: dataWithoutMeta,
            });
            stats.servicesUpdated++;
            console.log(`✅ ${progress} SERVICE UPDATED with changes (${changeCheck.changedFields.join(', ')}): ${service.title?.substring(0, 50)}...`);
          } else {
            // No changes detected
            stats.servicesSkipped++;
            stats.warnings.push(`Service ${service.id}: No changes detected`);
            console.log(`⚠️ ${progress} SERVICE SKIPPED - No changes: ${service.title?.substring(0, 50)}...`);
          }
        } else {
          // For creation, use the exact data from Strapi
          await targetDb.service.create({
            data: serviceData,
          });
          stats.servicesCreated++;
          console.log(`✅ ${progress} SERVICE CREATED: ${service.title?.substring(0, 50)}...`);
        }

      } catch (error) {
        const errorMsg = `Service ${service.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        stats.errors.push(errorMsg);
        console.error(`❌ ${progress} Error:`, error);
      }
    }

    // Step 6: Handle orphaned services (optional - skip for now)
    console.log('\n🔍 Processing orphaned services...');
    console.log(`⚠️ Skipping ${stats.orphanedServices} orphaned services (no freelancer relationship)`);
    stats.orphanResults.skipped = stats.orphanedServices;

    // Print migration summary
    console.log('\n📊 MIGRATION SUMMARY');
    console.log('===================');
    console.log(`Total services: ${stats.totalServices}`);
    console.log(`Services with freelancers: ${stats.servicesWithFreelancers}`);
    console.log(`Orphaned services: ${stats.orphanedServices}`);
    console.log(`Profiles matched: ${stats.matchedProfiles}`);
    console.log(`Profiles unmatched: ${stats.unmatchedProfiles}`);
    console.log(`\n📋 SERVICE OPERATIONS:`);
    console.log(`Services created: ${stats.servicesCreated}`);
    console.log(`Services updated: ${stats.servicesUpdated}`);
    console.log(`Services skipped: ${stats.servicesSkipped}`);
    console.log(`\n📈 STATUS DISTRIBUTION:`);
    Object.entries(stats.statusDistribution).forEach(([status, count]) => {
      console.log(`${status}: ${count}`);
    });
    console.log(`\n🚨 ISSUES:`);
    console.log(`Errors: ${stats.errors.length}`);
    console.log(`Warnings: ${stats.warnings.length}`);

    if (stats.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      stats.warnings.forEach((msg) => console.log(`  - ${msg}`));
    }

    if (stats.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      stats.errors.forEach((msg) => console.log(`  - ${msg}`));
    }

    console.log('\n🎉 Service migration completed!');

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

// Test function to verify migrated service
async function testServiceData(serviceId: string): Promise<boolean> {
  try {
    console.log(`🧪 Testing service data for service: ${serviceId}`);

    const service = await targetDb.service.findUnique({
      where: { id: parseInt(serviceId) },
      include: { 
        profile: {
          include: {
            user: true
          }
        }
      },
    });

    if (!service) {
      console.log('❌ Service not found');
      return false;
    }

    console.log('✅ Service data:');
    console.log(`  - ID: ${service.id}`);
    console.log(`  - Title: ${service.title}`);
    console.log(`  - Profile: ${service.profile.user.displayName || service.profile.user.email}`);
    console.log(`  - Category: ${service.category}`);
    console.log(`  - Price: €${service.price}`);
    console.log(`  - Duration: ${service.duration} days`);
    console.log(`  - Subscription Type: ${service.subscriptionType || 'None'}`);
    console.log(`  - Status: ${service.status}`);
    // REVIEWS DISABLED
    // console.log(`  - Rating: ${service.rating}/5 (${service.reviewCount} reviews)`);
    console.log(`  - Rating: 0/5 (0 reviews) - Reviews disabled`);
    console.log(`  - Featured: ${service.featured ? 'Yes' : 'No'}`);
    console.log(`  - Tags: ${service.tags?.join(', ') || 'None'}`);
    console.log(`  - Service Type:`, service.type);
    console.log(`  - Addons (${(service.addons as any[])?.length || 0}):`, service.addons);
    console.log(`  - FAQ (${(service.faq as any[])?.length || 0}):`, service.faq);
    
    if (service.media) {
      console.log(`  - Media:`, service.media);
    }

    return true;
  } catch (error) {
    console.error('❌ Service test error:', error);
    return false;
  }
}

// Analysis function
async function analyzeServiceMigration(): Promise<void> {
  try {
    console.log('📊 SERVICE MIGRATION ANALYSIS');
    console.log('=============================');

    const serviceStats = await targetDb.service.aggregate({
      _count: { id: true },
      // REVIEWS DISABLED
      // _avg: { rating: true, price: true, reviewCount: true },
      _avg: { price: true },
    });

    const statusDistribution = await targetDb.service.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const featuredCount = await targetDb.service.count({
      where: { featured: true },
    });

    console.log('\n📈 RESULTS:');
    console.log(`Total services: ${serviceStats._count.id}`);
    // REVIEWS DISABLED
    // console.log(`Average rating: ${serviceStats._avg.rating?.toFixed(2) || 'N/A'}`);
    console.log(`Average rating: 0.00 - Reviews disabled`);
    console.log(`Average price: €${serviceStats._avg.price?.toFixed(0) || 'N/A'}`);
    // console.log(`Average reviews: ${serviceStats._avg.reviewCount?.toFixed(1) || 'N/A'}`);
    console.log(`Average reviews: 0.0 - Reviews disabled`);
    console.log(`Featured services: ${featuredCount}`);
    
    console.log('\n📊 Status Distribution:');
    statusDistribution.forEach(stat => {
      console.log(`  ${stat.status}: ${stat._count.id}`);
    });

  } catch (error) {
    console.error('❌ Analysis error:', error);
  }
}

// Rollback function
async function rollbackServiceMigration(): Promise<void> {
  console.log('🔄 Starting service migration rollback...');

  try {
    await targetDb.$connect();

    const deleteResult = await targetDb.service.deleteMany({});

    console.log(`✅ Deleted ${deleteResult.count} services`);
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
    await rollbackServiceMigration();
    return;
  }

  if (args[0] === 'test' && args[1]) {
    await testServiceData(args[1]);
    return;
  }

  if (args[0] === 'analyze') {
    await analyzeServiceMigration();
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
  const stats = await migrateServices(shouldUpdateExisting);

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
  migrateServices,
  testServiceData,
  analyzeServiceMigration,
  rollbackServiceMigration,
};