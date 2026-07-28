/**
 * PROFILE IMAGE MIGRATION DEBUG SCRIPT
 * 
 * Analyzes profile image data structure in Strapi and tests migration to new format
 * 
 * Usage:
 * yarn tsx scripts/debug-profile-images.ts
 * yarn tsx scripts/debug-profile-images.ts --test-conversion
 * yarn tsx scripts/debug-profile-images.ts --freelancer-id 123
 */

import { PrismaClient as SourcePrismaClient } from '@prisma/client';
import { PrismaClient as TargetPrismaClient } from '@prisma/client';

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

interface StrapiFreelancerImage {
  id: number;
  username: string | null;
  display_name: string | null;
  email: string | null;
  image_id: number | null;
  image_data: StrapiFile | null;
}

interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  width?: number;
  height?: number;
  resource_type: 'image' | 'video' | 'raw' | 'audio' | 'auto';
  format?: string;
  bytes?: number;
  url?: string;
  created_at?: string;
  folder?: string;
  asset_id?: string;
  version?: number;
  etag?: string;
  signature?: string;
  tags?: string[];
  context?: Record<string, any>;
  metadata?: Record<string, any>;
  original_filename?: string;
  batch_id?: string;
  upload_status?: string;
  _pending?: boolean;
}

interface ImageAnalysisResult {
  totalFreelancers: number;
  freelancersWithImages: number;
  freelancersWithoutImages: number;
  imageProviders: Record<string, number>;
  imageSizes: { min: number; max: number; avg: number };
  imageFormats: Record<string, number>;
  urlPatterns: Record<string, number>;
  sampleImages: StrapiFreelancerImage[];
  conversionTest?: {
    originalFormat: any;
    convertedFormat: CloudinaryResource | null;
    success: boolean;
    error?: string;
  }[];
}

// Helper function to analyze URL patterns
function analyzeUrlPattern(url: string): string {
  if (url.includes('cloudinary.com')) return 'cloudinary';
  if (url.includes('googleapis.com')) return 'google-storage';
  if (url.includes('amazonaws.com')) return 'aws-s3';
  if (url.includes('digitaloceanspaces.com')) return 'digitalocean-spaces';
  if (url.startsWith('/uploads')) return 'local-uploads';
  if (url.startsWith('http')) return 'external-url';
  return 'unknown';
}

// Helper function to convert Strapi file to Cloudinary format
function convertStrapiFileToCloudinary(strapiFile: StrapiFile): CloudinaryResource | null {
  if (!strapiFile) return null;

  try {
    // Extract public_id from URL or hash
    let publicId = strapiFile.hash;
    
    // If it's already a Cloudinary URL, extract the public_id
    if (strapiFile.url.includes('cloudinary.com')) {
      const match = strapiFile.url.match(/\/v\d+\/(.+?)\./);
      if (match) {
        publicId = match[1];
      }
    }

    // Handle folder structure
    const folder = strapiFile.folder_path || 'profiles';

    const cloudinaryResource: CloudinaryResource = {
      public_id: `${folder}/${publicId}`,
      secure_url: strapiFile.url.startsWith('http') ? strapiFile.url : `https://your-domain.com${strapiFile.url}`,
      width: strapiFile.width || undefined,
      height: strapiFile.height || undefined,
      resource_type: 'image',
      format: strapiFile.ext?.replace('.', '') || undefined,
      bytes: Math.round(strapiFile.size * 1024), // Convert KB to bytes
      url: strapiFile.url.startsWith('http') ? strapiFile.url : `https://your-domain.com${strapiFile.url}`,
      created_at: strapiFile.created_at.toISOString(),
      folder: folder,
      original_filename: strapiFile.name,
    };

    // Add formats if they exist
    if (strapiFile.formats && typeof strapiFile.formats === 'object') {
      cloudinaryResource.metadata = {
        strapi_formats: strapiFile.formats,
        strapi_id: strapiFile.id,
        strapi_name: strapiFile.name,
        alternative_text: strapiFile.alternativeText,
        caption: strapiFile.caption,
      };
    }

    return cloudinaryResource;
  } catch (error) {
    console.error('Error converting Strapi file to Cloudinary format:', error);
    return null;
  }
}

// Helper function to validate CloudinaryResource
function validateCloudinaryResource(resource: CloudinaryResource): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!resource.public_id) errors.push('Missing public_id');
  if (!resource.secure_url) errors.push('Missing secure_url');
  if (!resource.resource_type) errors.push('Missing resource_type');
  if (resource.secure_url && !resource.secure_url.startsWith('https://')) {
    errors.push('secure_url should start with https://');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Helper function to inspect database schema
async function inspectFreelancersTable(): Promise<void> {
  console.log('🔍 Inspecting freelancers table structure...');
  
  try {
    const columns = await sourceDb.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'freelancers'
      ORDER BY ordinal_position
    `;
    
    console.log('📋 Freelancers table columns:');
    console.table(columns);
    
    // Also check for image-related tables
    const imageTables = await sourceDb.$queryRaw`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_name LIKE '%image%' OR table_name LIKE '%file%' OR table_name LIKE '%media%'
      ORDER BY table_name
    `;
    
    console.log('📁 Image/File related tables:');
    console.table(imageTables);
    
    // Check for relationship tables
    const relationshipTables = await sourceDb.$queryRaw`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_name LIKE '%freelancers%' AND (table_name LIKE '%link%' OR table_name LIKE '%relation%')
      ORDER BY table_name
    `;
    
    console.log('🔗 Freelancer relationship tables:');
    console.table(relationshipTables);
    
  } catch (error) {
    console.error('❌ Error inspecting database:', error);
  }
}

// Main analysis function
async function analyzeProfileImages(freelancerId?: number): Promise<ImageAnalysisResult> {
  console.log('🔍 Analyzing profile images in Strapi database...');

  // First, inspect the database structure
  await inspectFreelancersTable();

  try {
    // Let's start with a basic query to see what data we have
    let basicFreelancers: any[];
    
    if (freelancerId) {
      basicFreelancers = await sourceDb.$queryRaw`
        SELECT f.*, COUNT(*) OVER() as total_count
        FROM freelancers f
        WHERE f.id = ${freelancerId}
        LIMIT 5
      `;
    } else {
      basicFreelancers = await sourceDb.$queryRaw`
        SELECT f.*, COUNT(*) OVER() as total_count
        FROM freelancers f
        ORDER BY f.id
        LIMIT 5
      `;
    }
    
    console.log('\n📊 Sample freelancer records:');
    if (basicFreelancers.length > 0) {
      console.log('First record structure:');
      console.log(Object.keys(basicFreelancers[0]));
      console.log('\nSample data:');
      console.table(basicFreelancers.map(f => ({
        id: f.id,
        username: f.username,
        display_name: f.display_name,
        email: f.email,
        // Show all other columns that might contain image references
        ...Object.fromEntries(
          Object.entries(f).filter(([key, value]) => 
            key.toLowerCase().includes('image') || 
            key.toLowerCase().includes('photo') ||
            key.toLowerCase().includes('avatar') ||
            key.toLowerCase().includes('picture')
          )
        )
      })));
    }

    // Now let's try to find images through Strapi's relationship system
    // Strapi typically stores media relationships in separate link tables
    console.log('\n🔍 Looking for image relationships...');
    
    let freelancersWithImages: StrapiFreelancerImage[] = [];
    
    try {
      // Query to get freelancers with their image data through relationship tables
      if (freelancerId) {
        freelancersWithImages = await sourceDb.$queryRaw<StrapiFreelancerImage[]>`
          SELECT 
            f.id,
            f.username,
            f.display_name,
            f.email,
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
          WHERE f.id = ${freelancerId}
          ORDER BY f.id
          LIMIT 100
        `;
      } else {
        freelancersWithImages = await sourceDb.$queryRaw<StrapiFreelancerImage[]>`
          SELECT 
            f.id,
            f.username,
            f.display_name,
            f.email,
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
          ORDER BY f.id
          LIMIT 100
        `;
      }
    } catch (error) {
      console.log('❌ Error with files_related_morphs approach:', (error as Error).message);
      console.log('🔄 Trying alternative approach...');
      
      // Fallback: Let's check if there are any other relationship patterns
      try {
        // Try to find any files connected to freelancers
        const fileRelations = await sourceDb.$queryRaw`
          SELECT table_name, column_name
          FROM information_schema.columns 
          WHERE column_name LIKE '%file%' OR column_name LIKE '%image%'
          ORDER BY table_name
        `;
        
        console.log('📁 File/Image related columns:');
        console.table(fileRelations);
        
        // For now, return the basic freelancer data without images
        freelancersWithImages = basicFreelancers.map(f => ({
          id: f.id,
          username: f.username,
          display_name: f.display_name,
          email: f.email,
          image_id: null,
          image_data: null,
        }));
        
      } catch (fallbackError) {
        console.log('❌ Fallback also failed:', (fallbackError as Error).message);
        freelancersWithImages = [];
      }
    }

    const result: ImageAnalysisResult = {
      totalFreelancers: freelancersWithImages.length,
      freelancersWithImages: 0,
      freelancersWithoutImages: 0,
      imageProviders: {},
      imageSizes: { min: Infinity, max: 0, avg: 0 },
      imageFormats: {},
      urlPatterns: {},
      sampleImages: [],
    };

    let totalSize = 0;
    const sizes: number[] = [];

    for (const freelancer of freelancersWithImages) {
      if (freelancer.image_data) {
        result.freelancersWithImages++;
        
        const imageData = freelancer.image_data;
        
        // Analyze provider
        const provider = imageData.provider || 'unknown';
        result.imageProviders[provider] = (result.imageProviders[provider] || 0) + 1;
        
        // Analyze formats
        const format = imageData.ext || 'unknown';
        result.imageFormats[format] = (result.imageFormats[format] || 0) + 1;
        
        // Analyze URL patterns
        const urlPattern = analyzeUrlPattern(imageData.url);
        result.urlPatterns[urlPattern] = (result.urlPatterns[urlPattern] || 0) + 1;
        
        // Analyze sizes
        if (imageData.size) {
          sizes.push(imageData.size);
          totalSize += imageData.size;
          result.imageSizes.min = Math.min(result.imageSizes.min, imageData.size);
          result.imageSizes.max = Math.max(result.imageSizes.max, imageData.size);
        }
        
        // Collect samples
        if (result.sampleImages.length < 5) {
          result.sampleImages.push(freelancer);
        }
      } else {
        result.freelancersWithoutImages++;
      }
    }

    // Calculate average size
    if (sizes.length > 0) {
      result.imageSizes.avg = Math.round(totalSize / sizes.length);
      if (result.imageSizes.min === Infinity) result.imageSizes.min = 0;
    } else {
      result.imageSizes = { min: 0, max: 0, avg: 0 };
    }

    return result;
  } catch (error) {
    console.error('❌ Error analyzing profile images:', error);
    throw error;
  }
}

// Test conversion function
async function testImageConversion(freelancerId?: number): Promise<ImageAnalysisResult> {
  console.log('🧪 Testing image conversion to Cloudinary format...');
  
  const result = await analyzeProfileImages(freelancerId);
  
  result.conversionTest = [];
  
  for (const sample of result.sampleImages) {
    if (sample.image_data) {
      const converted = convertStrapiFileToCloudinary(sample.image_data);
      const validation = converted ? validateCloudinaryResource(converted) : { valid: false, errors: ['Conversion failed'] };
      
      result.conversionTest.push({
        originalFormat: {
          id: sample.image_data.id,
          name: sample.image_data.name,
          url: sample.image_data.url,
          provider: sample.image_data.provider,
          size: sample.image_data.size,
          width: sample.image_data.width,
          height: sample.image_data.height,
        },
        convertedFormat: converted,
        success: validation.valid,
        error: validation.errors.length > 0 ? validation.errors.join(', ') : undefined,
      });
    }
  }
  
  return result;
}

// Print analysis results
function printAnalysisResults(result: ImageAnalysisResult) {
  console.log('\n📊 PROFILE IMAGE ANALYSIS RESULTS');
  console.log('==================================');
  
  console.log(`Total freelancers analyzed: ${result.totalFreelancers}`);
  console.log(`With images: ${result.freelancersWithImages}`);
  console.log(`Without images: ${result.freelancersWithoutImages}`);
  console.log(`Image coverage: ${((result.freelancersWithImages / result.totalFreelancers) * 100).toFixed(1)}%`);
  
  console.log('\n📁 IMAGE PROVIDERS:');
  Object.entries(result.imageProviders).forEach(([provider, count]) => {
    console.log(`  ${provider}: ${count} images`);
  });
  
  console.log('\n🖼️  IMAGE FORMATS:');
  Object.entries(result.imageFormats).forEach(([format, count]) => {
    console.log(`  ${format}: ${count} images`);
  });
  
  console.log('\n🔗 URL PATTERNS:');
  Object.entries(result.urlPatterns).forEach(([pattern, count]) => {
    console.log(`  ${pattern}: ${count} images`);
  });
  
  console.log('\n📏 IMAGE SIZES (KB):');
  console.log(`  Min: ${result.imageSizes.min}KB`);
  console.log(`  Max: ${result.imageSizes.max}KB`);
  console.log(`  Avg: ${result.imageSizes.avg}KB`);
  
  if (result.sampleImages.length > 0) {
    console.log('\n🔬 SAMPLE IMAGES:');
    result.sampleImages.forEach((sample, index) => {
      console.log(`\n  Sample ${index + 1}:`);
      console.log(`    Freelancer: ${sample.display_name || sample.username || sample.email} (ID: ${sample.id})`);
      if (sample.image_data) {
        console.log(`    Image ID: ${sample.image_data.id}`);
        console.log(`    Name: ${sample.image_data.name}`);
        console.log(`    Provider: ${sample.image_data.provider}`);
        console.log(`    URL: ${sample.image_data.url}`);
        console.log(`    Size: ${sample.image_data.width}x${sample.image_data.height} (${sample.image_data.size}KB)`);
      }
    });
  }
  
  if (result.conversionTest) {
    console.log('\n🧪 CONVERSION TEST RESULTS:');
    result.conversionTest.forEach((test, index) => {
      console.log(`\n  Test ${index + 1}: ${test.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      console.log(`    Original: ${test.originalFormat.name} (${test.originalFormat.provider})`);
      if (test.convertedFormat) {
        console.log(`    Converted: ${test.convertedFormat.public_id}`);
        console.log(`    Secure URL: ${test.convertedFormat.secure_url}`);
      }
      if (test.error) {
        console.log(`    Error: ${test.error}`);
      }
    });
  }
}

// Generate migration code for images
function generateImageMigrationCode(result: ImageAnalysisResult): string {
  const migrationCode = `
// Add this to your profile migration script

// Helper function to convert Strapi file to Cloudinary resource
function convertStrapiFileToCloudinaryResource(strapiFile: any): any | null {
  if (!strapiFile) return null;

  try {
    // Extract public_id from URL or use hash
    let publicId = strapiFile.hash;
    
    // If it's already a Cloudinary URL, extract the public_id
    if (strapiFile.url.includes('cloudinary.com')) {
      const match = strapiFile.url.match(/\\/v\\d+\\/(.+?)\\./);
      if (match) {
        publicId = match[1];
      }
    }

    // Handle folder structure
    const folder = strapiFile.folder_path || 'profiles';

    return {
      public_id: \`\${folder}/\${publicId}\`,
      secure_url: strapiFile.url.startsWith('http') ? strapiFile.url : \`https://your-domain.com\${strapiFile.url}\`,
      width: strapiFile.width || undefined,
      height: strapiFile.height || undefined,
      resource_type: 'image',
      format: strapiFile.ext?.replace('.', '') || undefined,
      bytes: Math.round(strapiFile.size * 1024), // Convert KB to bytes
      url: strapiFile.url.startsWith('http') ? strapiFile.url : \`https://your-domain.com\${strapiFile.url}\`,
      created_at: strapiFile.created_at.toISOString(),
      folder: folder,
      original_filename: strapiFile.name,
      metadata: {
        strapi_id: strapiFile.id,
        strapi_name: strapiFile.name,
        alternative_text: strapiFile.alternativeText,
        caption: strapiFile.caption,
      },
    };
  } catch (error) {
    console.error('Error converting image:', error);
    return null;
  }
}

// Add this query to your migration to fetch image data
const freelancersWithImages = await sourceDb.$queryRaw\`
  SELECT 
    f.id,
    CASE 
      WHEN f.image IS NOT NULL THEN (
        SELECT row_to_json(file_data.*)
        FROM files file_data
        WHERE file_data.id = f.image
      )
      ELSE NULL
    END as image_data
  FROM freelancers f
  WHERE f.id = ANY($\{freelancerIds})
\`;

// Create a map for quick lookup
const imageMap = new Map();
for (const row of freelancersWithImages) {
  if (row.image_data) {
    imageMap.set(row.id, convertStrapiFileToCloudinaryResource(row.image_data));
  }
}

// In your profile creation code, add:
const profileData = {
  // ... existing profile data
  image: imageMap.get(freelancer.id) || null,
  // ... rest of profile data
};
`;

  return migrationCode;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const testConversion = args.includes('--test-conversion');
  const freelancerIdFlag = args.find(arg => arg.startsWith('--freelancer-id'));
  const freelancerId = freelancerIdFlag ? parseInt(freelancerIdFlag.split('=')[1]) : undefined;

  try {
    console.log('🚀 Starting profile image debug analysis...');
    
    await sourceDb.$connect();
    console.log('✅ Connected to source database');

    let result: ImageAnalysisResult;
    
    if (testConversion) {
      result = await testImageConversion(freelancerId);
    } else {
      result = await analyzeProfileImages(freelancerId);
    }
    
    printAnalysisResults(result);
    
    if (testConversion) {
      console.log('\n📝 MIGRATION CODE:');
      console.log(generateImageMigrationCode(result));
    }
    
    console.log('\n🎉 Analysis completed successfully!');
    
  } catch (error) {
    console.error('💥 Error during analysis:', error);
    process.exit(1);
  } finally {
    await sourceDb.$disconnect();
    console.log('🔌 Disconnected from database');
  }
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
  analyzeProfileImages,
  testImageConversion,
  convertStrapiFileToCloudinary,
  validateCloudinaryResource,
};