/**
 * TAXONOMY IMAGE MIGRATION SCRIPT
 *
 * Extracts Cloudinary images from Strapi database and attaches them to service taxonomies
 *
 * Usage:
 * yarn migrate:taxonomy-images
 * yarn migrate:taxonomy-images --output-only
 * yarn migrate:taxonomy-images --preview
 *
 * This script:
 * 1. Extracts images from Strapi categories, subcategories, and subdivisions
 * 2. Converts them to CloudinaryResource format
 * 3. Generates updated service-taxonomies.ts with image data
 * 4. Uses nanoid for collision-proof ID generation
 */

import { PrismaClient as SourcePrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';

// Database connection
const sourceDb = new SourcePrismaClient({
  datasources: {
    db: {
      url: process.env.SOURCE_DATABASE_URL, // DigitalOcean PostgreSQL
    },
  },
});

// Interfaces
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

interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  width?: number;
  height?: number;
  resource_type: 'image' | 'video' | 'raw' | 'audio' | 'auto';
  format?: string;
  bytes?: number;
  url?: string;
  original_filename?: string;
}

interface TaxonomyWithImage {
  id: string;
  label: string;
  slug: string;
  description: string;
  image?: CloudinaryResource;
  // Additional fields for specific levels
  icon?: string;
  featured?: string;
  child_count?: number;
  children?: TaxonomyWithImage[];
}

interface TaxonomyImageData {
  categories: Map<string, CloudinaryResource>;
  subcategories: Map<string, CloudinaryResource>;
  subdivisions: Map<string, CloudinaryResource>;
}

// Track generated IDs to ensure uniqueness
const generatedIds = new Set<string>();

// Helper function to generate unique 6-character nanoid
function generateUniqueNanoid(): string {
  let id: string;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    id = nanoid(6);
    attempts++;
    if (attempts > maxAttempts) {
      throw new Error('Failed to generate unique nanoid after 100 attempts');
    }
  } while (generatedIds.has(id));

  generatedIds.add(id);
  return id;
}

// Helper function to convert Strapi file to Cloudinary format (same as service migration)
function convertStrapiFileToCloudinary(strapiFile: StrapiFile): CloudinaryResource {
  // Determine resource type based on MIME type
  let resourceType: 'image' | 'video' | 'raw' | 'audio' | 'auto' = 'raw';
  const mimeType = strapiFile.mime || '';
  const ext = strapiFile.ext ? strapiFile.ext.toLowerCase() : '';

  if (mimeType.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'].includes(ext)) {
    resourceType = 'image';
  } else if (mimeType.startsWith('video/') || ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm', '.m4v'].includes(ext)) {
    resourceType = 'video';
  } else if (mimeType.startsWith('audio/') || ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma'].includes(ext)) {
    resourceType = 'audio';
  }

  // Extract public_id from URL or use hash
  let publicId = strapiFile.hash;
  if (strapiFile.url.includes('cloudinary.com')) {
    const match = strapiFile.url.match(/\/v\d+\/(.+?)\./);
    if (match) {
      publicId = match[1];
    }
  }

  return {
    public_id: publicId,
    secure_url: strapiFile.url,
    width: strapiFile.width || undefined,
    height: strapiFile.height || undefined,
    resource_type: resourceType,
    format: strapiFile.ext ? strapiFile.ext.replace('.', '') : undefined,
    bytes: strapiFile.size ? Math.round(strapiFile.size * 1024) : undefined, // Convert KB to bytes
    url: strapiFile.url,
    original_filename: strapiFile.name || undefined,
  };
}

// Load all taxonomy images from Strapi
async function loadTaxonomyImages(): Promise<TaxonomyImageData> {
  console.log('📥 Loading taxonomy images from Strapi database...');

  const imageData: TaxonomyImageData = {
    categories: new Map(),
    subcategories: new Map(),
    subdivisions: new Map(),
  };

  try {
    // Load category images
    console.log('📁 Loading category images...');

    // First, let's check the database schema to understand the structure
    const tableInfo = await sourceDb.$queryRawUnsafe(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'categories'
      ORDER BY ordinal_position
    `) as { column_name: string; data_type: string }[];

    console.log('📋 Categories table structure:');
    tableInfo.forEach(col => console.log(`  - ${col.column_name}: ${col.data_type}`));

    // Check if there are any link tables for relationships
    const relationTables = await sourceDb.$queryRawUnsafe(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE '%categories%'
      ORDER BY table_name
    `) as { table_name: string }[];

    console.log('📋 Categories-related tables:');
    relationTables.forEach(table => console.log(`  - ${table.table_name}`));

    // Try the original files_related_morphs approach first to see the data structure
    const categoryImages = await sourceDb.$queryRawUnsafe(`
      SELECT
        c.id,
        c.label,
        f.id as file_id,
        f.name,
        f.alternative_text,
        f.caption,
        f.width,
        f.height,
        f.formats,
        f.hash,
        f.ext,
        f.mime,
        f.size,
        f.url,
        f.preview_url as previewUrl,
        f.provider,
        f.provider_metadata,
        f.created_at,
        f.updated_at,
        f.folder_path
      FROM categories c
      JOIN files_related_morphs frm ON frm.related_id = c.id AND frm.related_type = 'api::category.category'
      JOIN files f ON frm.file_id = f.id
      ORDER BY c.id
    `) as (StrapiFile & { label: string })[];

    categoryImages.forEach(item => {
      const cloudinaryResource = convertStrapiFileToCloudinary(item);
      const nanoidId = generateUniqueNanoid();
      imageData.categories.set(nanoidId, cloudinaryResource);
      console.log(`  ✅ Category: ${item.label} (Strapi ID: ${item.id} → Nanoid: ${nanoidId}) → ${cloudinaryResource.secure_url}`);
    });

    // Load subcategory images
    console.log('📁 Loading subcategory images...');
    const subcategoryImages = await sourceDb.$queryRawUnsafe(`
      SELECT
        sc.id,
        sc.label,
        f.id as file_id,
        f.name,
        f.alternative_text,
        f.caption,
        f.width,
        f.height,
        f.formats,
        f.hash,
        f.ext,
        f.mime,
        f.size,
        f.url,
        f.preview_url as previewUrl,
        f.provider,
        f.provider_metadata,
        f.created_at,
        f.updated_at,
        f.folder_path
      FROM subcategories sc
      JOIN files_related_morphs frm ON frm.related_id = sc.id AND frm.related_type = 'api::subcategory.subcategory'
      JOIN files f ON frm.file_id = f.id
      ORDER BY sc.id
    `) as (StrapiFile & { label: string })[];

    subcategoryImages.forEach(item => {
      const cloudinaryResource = convertStrapiFileToCloudinary(item);
      const nanoidId = generateUniqueNanoid();
      imageData.subcategories.set(nanoidId, cloudinaryResource);
      console.log(`  ✅ Subcategory: ${item.label} (Strapi ID: ${item.id} → Nanoid: ${nanoidId}) → ${cloudinaryResource.secure_url}`);
    });

    // Load subdivision images
    console.log('📁 Loading subdivision images...');
    const subdivisionImages = await sourceDb.$queryRawUnsafe(`
      SELECT
        sd.id,
        sd.label,
        f.id as file_id,
        f.name,
        f.alternative_text,
        f.caption,
        f.width,
        f.height,
        f.formats,
        f.hash,
        f.ext,
        f.mime,
        f.size,
        f.url,
        f.preview_url as previewUrl,
        f.provider,
        f.provider_metadata,
        f.created_at,
        f.updated_at,
        f.folder_path
      FROM subdivisions sd
      JOIN files_related_morphs frm ON frm.related_id = sd.id AND frm.related_type = 'api::subdivision.subdivision'
      JOIN files f ON frm.file_id = f.id
      ORDER BY sd.id
    `) as (StrapiFile & { label: string })[];

    subdivisionImages.forEach(item => {
      const cloudinaryResource = convertStrapiFileToCloudinary(item);
      const nanoidId = generateUniqueNanoid();
      imageData.subdivisions.set(nanoidId, cloudinaryResource);
      console.log(`  ✅ Subdivision: ${item.label} (Strapi ID: ${item.id} → Nanoid: ${nanoidId}) → ${cloudinaryResource.secure_url}`);
    });

    console.log(`\n📊 Image Summary:`);
    console.log(`  - Categories with images: ${imageData.categories.size}`);
    console.log(`  - Subcategories with images: ${imageData.subcategories.size}`);
    console.log(`  - Subdivisions with images: ${imageData.subdivisions.size}`);

    return imageData;
  } catch (error) {
    console.error('❌ Error loading taxonomy images:', error);
    throw error;
  }
}

// Load existing service taxonomies
async function loadExistingTaxonomies(): Promise<any[]> {
  console.log('📥 Loading existing service taxonomies...');

  // Use the backup file to get the original data
  const backupPath = path.join(__dirname, '../src/constants/datasets/service-taxonomies.ts.backup');
  const taxonomyPath = path.join(__dirname, '../src/constants/datasets/service-taxonomies.ts');

  // Try backup first, then original
  const filePath = fs.existsSync(backupPath) ? backupPath : taxonomyPath;

  if (!fs.existsSync(filePath)) {
    throw new Error(`Taxonomy file not found: ${filePath}`);
  }

  console.log(`📂 Reading from: ${path.basename(filePath)}`);

  try {
    // Read and parse the existing file more safely
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // Find the start of the array
    const arrayStartPattern = /export const serviceTaxonomies = \[/;
    const startMatch = fileContent.match(arrayStartPattern);
    if (!startMatch) {
      throw new Error('Could not find serviceTaxonomies export in file');
    }

    const startIndex = startMatch.index! + startMatch[0].length - 1; // Include the opening bracket

    // Find matching closing bracket
    let bracketCount = 0;
    let endIndex = startIndex;

    for (let i = startIndex; i < fileContent.length; i++) {
      const char = fileContent[i];
      if (char === '[') bracketCount++;
      else if (char === ']') {
        bracketCount--;
        if (bracketCount === 0) {
          endIndex = i;
          break;
        }
      }
    }

    if (bracketCount !== 0) {
      throw new Error('Could not find matching closing bracket for serviceTaxonomies array');
    }

    const arrayContent = fileContent.substring(startIndex, endIndex + 1);

    // Convert TypeScript object notation to JSON
    let jsonContent = arrayContent
      // Handle single quotes to double quotes
      .replace(/'/g, '"')
      // Handle unquoted object keys
      .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
      // Handle array start
      .replace(/^\s*\[\s*/, '[')
      // Clean up any trailing commas before closing brackets/braces
      .replace(/,(\s*[\]}])/g, '$1');

    const taxonomies = JSON.parse(jsonContent);
    console.log(`📊 Loaded ${taxonomies.length} existing categories`);
    return taxonomies;
  } catch (error) {
    console.error('❌ Error parsing existing taxonomies:', error);
    console.log('💡 Make sure the service-taxonomies.ts file has valid TypeScript syntax');
    throw error;
  }
}

// Attach images to taxonomy structure
function attachImages(taxonomies: any[], imageData: TaxonomyImageData): any[] {
  console.log('🔗 Attaching images to taxonomy structure...');

  const processedTaxonomies = taxonomies.map(category => {
    const categoryWithImage = { ...category };

    // Attach category image
    const categoryImage = imageData.categories.get(category.id);
    if (categoryImage) {
      categoryWithImage.image = categoryImage;
      console.log(`  ✅ Category: ${category.label} → image attached`);
    }

    // Process subcategories
    if (category.children && Array.isArray(category.children)) {
      categoryWithImage.children = category.children.map((subcategory: any) => {
        const subcategoryWithImage = { ...subcategory };

        // Attach subcategory image
        const subcategoryImage = imageData.subcategories.get(subcategory.id);
        if (subcategoryImage) {
          subcategoryWithImage.image = subcategoryImage;
          console.log(`    ✅ Subcategory: ${subcategory.label} → image attached`);
        }

        // Process subdivisions
        if (subcategory.children && Array.isArray(subcategory.children)) {
          subcategoryWithImage.children = subcategory.children.map((subdivision: any) => {
            const subdivisionWithImage = { ...subdivision };

            // Attach subdivision image
            const subdivisionImage = imageData.subdivisions.get(subdivision.id);
            if (subdivisionImage) {
              subdivisionWithImage.image = subdivisionImage;
              console.log(`      ✅ Subdivision: ${subdivision.label} → image attached`);
            }

            return subdivisionWithImage;
          });
        }

        return subcategoryWithImage;
      });
    }

    return categoryWithImage;
  });

  return processedTaxonomies;
}

// Generate updated TypeScript file
function generateUpdatedTaxonomyFile(taxonomies: any[]): string {
  const now = new Date().toISOString();

  const header = `// Generated on ${now}
// All data is sorted alphabetically by label/name at all levels
// Three-level taxonomy hierarchy: categories → subcategories → subdivisions
// Complete three-level taxonomy hierarchy: categories → subcategories → subdivisions
// Images attached from Strapi Cloudinary integration

// CloudinaryResource interface for taxonomy images
export interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  width?: number;
  height?: number;
  resource_type: 'image' | 'video' | 'raw' | 'audio' | 'auto';
  format?: string;
  bytes?: number;
  url?: string;
  original_filename?: string;
}

export const serviceTaxonomies = `;

  // Convert to TypeScript object format (no quotes around keys)
  let taxonomyContent = JSON.stringify(taxonomies, null, 2);

  // Convert JSON format to TypeScript object format
  taxonomyContent = taxonomyContent
    .replace(/"(\w+)":/g, '$1:')  // Remove quotes around simple property names
    .replace(/"/g, "'")  // Convert double quotes to single quotes for strings

  return header + taxonomyContent + ';';
}

// Write updated file
async function writeUpdatedTaxonomyFile(content: string): Promise<void> {
  const outputPath = path.join(__dirname, '../src/constants/datasets/service-taxonomies.ts');
  const backupPath = path.join(__dirname, '../src/constants/datasets/service-taxonomies.ts.backup');

  // Create backup
  if (fs.existsSync(outputPath)) {
    fs.copyFileSync(outputPath, backupPath);
    console.log(`📄 Backup created: ${path.basename(backupPath)}`);
  }

  // Write new file
  fs.writeFileSync(outputPath, content, 'utf-8');
  console.log(`📄 Updated taxonomy file written: ${path.basename(outputPath)}`);
}

// Preview function
async function previewChanges(imageData: TaxonomyImageData): Promise<void> {
  console.log('\n🔍 PREVIEW MODE - Changes that would be made:');
  console.log('='.repeat(50));

  console.log(`\n📁 Categories with images (${imageData.categories.size}):`);
  imageData.categories.forEach((image, id) => {
    console.log(`  - ID ${id}: ${image.secure_url}`);
  });

  console.log(`\n📁 Subcategories with images (${imageData.subcategories.size}):`);
  imageData.subcategories.forEach((image, id) => {
    console.log(`  - ID ${id}: ${image.secure_url}`);
  });

  console.log(`\n📁 Subdivisions with images (${imageData.subdivisions.size}):`);
  imageData.subdivisions.forEach((image, id) => {
    console.log(`  - ID ${id}: ${image.secure_url}`);
  });

  console.log('\n💡 Run without --preview to apply these changes');
}

// Main migration function
async function migrateTaxonomyImages(options: { preview?: boolean; outputOnly?: boolean } = {}): Promise<void> {
  try {
    console.log('🚀 Starting taxonomy image migration...');

    await sourceDb.$connect();
    console.log('✅ Connected to Strapi database');

    // Load images from Strapi
    const imageData = await loadTaxonomyImages();

    if (options.preview) {
      await previewChanges(imageData);
      return;
    }

    // Load existing taxonomies
    const existingTaxonomies = await loadExistingTaxonomies();

    // Attach images to taxonomy structure
    const taxonomiesWithImages = attachImages(existingTaxonomies, imageData);

    // Generate updated file content
    const updatedContent = generateUpdatedTaxonomyFile(taxonomiesWithImages);

    if (options.outputOnly) {
      console.log('\n📄 Generated file content (first 1000 chars):');
      console.log('-'.repeat(50));
      console.log(updatedContent.substring(0, 1000) + '...');
      console.log('-'.repeat(50));
      return;
    }

    // Write updated file
    await writeUpdatedTaxonomyFile(updatedContent);

    console.log('\n🎉 Taxonomy image migration completed successfully!');
    console.log('📊 Summary:');
    console.log(`  - Categories updated: ${imageData.categories.size}`);
    console.log(`  - Subcategories updated: ${imageData.subcategories.size}`);
    console.log(`  - Subdivisions updated: ${imageData.subdivisions.size}`);

  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  } finally {
    await sourceDb.$disconnect();
    console.log('🔌 Database connection closed');
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    preview: args.includes('--preview'),
    outputOnly: args.includes('--output-only'),
  };

  await migrateTaxonomyImages(options);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled rejection:', error);
  process.exit(1);
});

if (require.main === module) {
  main().catch(console.error);
}

export { migrateTaxonomyImages };