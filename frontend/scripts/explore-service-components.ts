/**
 * Deep dive into service components and pricing packages
 */

import { PrismaClient as SourcePrismaClient } from '@prisma/client';

const sourceDb = new SourcePrismaClient({
  datasources: {
    db: {
      url: process.env.SOURCE_DATABASE_URL,
    },
  },
});

async function exploreServiceComponents() {
  try {
    console.log('🔍 Exploring Service Components Structure...\n');
    
    // 1. Service Type Component
    console.log('=== SERVICE TYPE COMPONENT ===');
    const serviceTypeColumns = await sourceDb.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'components_service_types'
      ORDER BY ordinal_position
    ` as any[];
    
    console.log('Service Type columns:');
    serviceTypeColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Sample service types
    const sampleTypes = await sourceDb.$queryRaw`
      SELECT * FROM components_service_types LIMIT 3
    ` as any[];
    
    console.log('\nSample Service Types:');
    sampleTypes.forEach(type => {
      console.log(`  ID: ${type.id}, Type: ${type.type || 'N/A'}, Options: ${type.options || 'N/A'}`);
    });
    
    // 2. Pricing Components
    console.log('\n=== PRICING COMPONENTS ===');
    
    // Basic Package
    console.log('\nBasic Package Structure:');
    const basicPackageColumns = await sourceDb.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'components_pricing_basic_packages'
      ORDER BY ordinal_position
    ` as any[];
    
    basicPackageColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Standard Package
    console.log('\nStandard Package Structure:');
    const standardPackageColumns = await sourceDb.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'components_pricing_standard_packages'
      ORDER BY ordinal_position
    ` as any[];
    
    standardPackageColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Premium Package
    console.log('\nPremium Package Structure:');
    const premiumPackageColumns = await sourceDb.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'components_pricing_premium_packages'
      ORDER BY ordinal_position
    ` as any[];
    
    premiumPackageColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // 3. Pricing Addons
    console.log('\n=== PRICING ADDONS ===');
    const addonColumns = await sourceDb.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'components_pricing_addons'
      ORDER BY ordinal_position
    ` as any[];
    
    console.log('Addon columns:');
    addonColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Sample addons
    const sampleAddons = await sourceDb.$queryRaw`
      SELECT * FROM components_pricing_addons LIMIT 3
    ` as any[];
    
    console.log('\nSample Addons:');
    sampleAddons.forEach(addon => {
      console.log(`  ID: ${addon.id}`);
      console.log(`    Title: ${addon.title || 'N/A'}`);
      console.log(`    Description: ${addon.description?.substring(0, 50) || 'N/A'}...`);
      console.log(`    Price: ${addon.price || 'N/A'}`);
    });
    
    // 4. FAQ Component
    console.log('\n=== FAQ COMPONENT ===');
    const faqColumns = await sourceDb.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'components_pricing_faqs'
      ORDER BY ordinal_position
    ` as any[];
    
    console.log('FAQ columns:');
    faqColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // 5. Service-Component Relationships
    console.log('\n=== SERVICE-COMPONENT RELATIONSHIPS ===');
    const serviceComponentMapping = await sourceDb.$queryRaw`
      SELECT 
        sc.entity_id as service_id,
        sc.component_type,
        sc.component_id,
        sc.field,
        sc.order
      FROM services_components sc
      WHERE sc.entity_id IN (
        SELECT id FROM services LIMIT 5
      )
      ORDER BY sc.entity_id, sc.order
    ` as any[];
    
    console.log('Service-Component mappings (first 5 services):');
    let currentServiceId = null;
    serviceComponentMapping.forEach(mapping => {
      if (currentServiceId !== mapping.service_id) {
        currentServiceId = mapping.service_id;
        console.log(`\nService ${currentServiceId}:`);
      }
      console.log(`  - ${mapping.field}: ${mapping.component_type} (ID: ${mapping.component_id})`);
    });
    
    // 6. Service with full component data
    console.log('\n=== COMPLETE SERVICE WITH COMPONENTS ===');
    const completeService = await sourceDb.$queryRaw`
      SELECT 
        s.id,
        s.title,
        s.description,
        s.price,
        s.time,
        s.fixed,
        s.rating,
        s.reviews_total,
        s.featured,
        s.published_at,
        sfl.freelancer_id,
        scl.category_id,
        sscl.subcategory_id,
        ssdl.subdivision_id
      FROM services s
      LEFT JOIN services_freelancer_links sfl ON s.id = sfl.service_id
      LEFT JOIN services_category_links scl ON s.id = scl.service_id
      LEFT JOIN services_subcategory_links sscl ON s.id = sscl.service_id
      LEFT JOIN services_subdivision_links ssdl ON s.id = ssdl.service_id
      WHERE s.published_at IS NOT NULL
      LIMIT 1
    ` as any[];
    
    if (completeService.length > 0) {
      const service = completeService[0];
      console.log(`Service: ${service.title}`);
      console.log(`  ID: ${service.id}`);
      console.log(`  Freelancer ID: ${service.freelancer_id || 'N/A'}`);
      console.log(`  Category ID: ${service.category_id || 'N/A'}`);
      console.log(`  Subcategory ID: ${service.subcategory_id || 'N/A'}`);
      console.log(`  Subdivision ID: ${service.subdivision_id || 'N/A'}`);
      console.log(`  Price: ${service.price || 'N/A'}`);
      console.log(`  Time: ${service.time || 'N/A'}`);
      console.log(`  Fixed: ${service.fixed}`);
      console.log(`  Rating: ${service.rating || 0}`);
      console.log(`  Reviews: ${service.reviews_total || 0}`);
      console.log(`  Featured: ${service.featured}`);
      
      // Get components for this service
      const components = await sourceDb.$queryRaw`
        SELECT 
          component_type,
          component_id,
          field
        FROM services_components
        WHERE entity_id = ${service.id}
        ORDER BY "order"
      ` as any[];
      
      console.log(`\n  Components:`);
      for (const comp of components) {
        console.log(`    ${comp.field}: ${comp.component_type} (ID: ${comp.component_id})`);
        
        // Get component details based on type
        if (comp.component_type === 'pricing.addon') {
          const addon = await sourceDb.$queryRaw`
            SELECT title, price FROM components_pricing_addons WHERE id = ${comp.component_id}
          ` as any[];
          if (addon.length > 0) {
            console.log(`      -> ${addon[0].title}: €${addon[0].price}`);
          }
        }
      }
    }
    
    // 7. Service status
    console.log('\n=== SERVICE STATUS ===');
    const statusTable = await sourceDb.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'statuses'
      ORDER BY ordinal_position
    ` as any[];
    
    if (statusTable.length > 0) {
      console.log('Status columns:');
      statusTable.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
      
      const statuses = await sourceDb.$queryRaw`
        SELECT * FROM statuses
      ` as any[];
      
      console.log('\nAvailable statuses:');
      statuses.forEach(status => {
        console.log(`  - ${status.id}: ${status.name || status.type || 'N/A'}`);
      });
    }
    
    // 8. Service location/area data
    console.log('\n=== SERVICE LOCATION DATA ===');
    const locationServices = await sourceDb.$queryRaw`
      SELECT 
        s.id,
        s.title,
        sal.area_id,
        scl.county_id,
        szl.zipcode_id
      FROM services s
      LEFT JOIN services_area_links sal ON s.id = sal.service_id
      LEFT JOIN services_county_links scl ON s.id = scl.service_id
      LEFT JOIN services_zipcode_links szl ON s.id = szl.service_id
      WHERE sal.area_id IS NOT NULL 
         OR scl.county_id IS NOT NULL 
         OR szl.zipcode_id IS NOT NULL
      LIMIT 5
    ` as any[];
    
    console.log('Services with location data (first 5):');
    locationServices.forEach(service => {
      console.log(`  Service ${service.id}: ${service.title?.substring(0, 50)}...`);
      console.log(`    Area: ${service.area_id || 'N/A'}`);
      console.log(`    County: ${service.county_id || 'N/A'}`);
      console.log(`    Zipcode: ${service.zipcode_id || 'N/A'}`);
    });
    
  } catch (error) {
    console.error('Error exploring service components:', error);
  } finally {
    await sourceDb.$disconnect();
  }
}

// Run the exploration
exploreServiceComponents()
  .then(() => console.log('\n✅ Component exploration complete!'))
  .catch(console.error);