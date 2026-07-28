/**
 * Script to explore the Strapi services table structure and relationships
 * This will help us understand what needs to be migrated
 */

import { PrismaClient as SourcePrismaClient } from '@prisma/client';

const sourceDb = new SourcePrismaClient({
  datasources: {
    db: {
      url: process.env.SOURCE_DATABASE_URL,
    },
  },
});

async function exploreServicesStructure() {
  try {
    console.log('🔍 Exploring Strapi Services Structure...\n');
    
    // 1. Basic services table structure
    console.log('=== SERVICES TABLE STRUCTURE ===');
    const servicesColumns = await sourceDb.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'services'
      ORDER BY ordinal_position
    ` as any[];
    
    console.log('Services columns:');
    servicesColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // 2. Count services
    const serviceCount = await sourceDb.$queryRaw`
      SELECT COUNT(*) as count FROM services
    ` as any[];
    console.log(`\n📊 Total services: ${serviceCount[0].count}`);
    
    // 3. Service relationships - Find all link tables
    console.log('\n=== SERVICE RELATIONSHIP TABLES ===');
    const relationTables = await sourceDb.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' 
        AND table_name LIKE '%services%links%'
      ORDER BY table_name
    ` as any[];
    
    console.log('Service relationship tables:');
    relationTables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
    // 4. Get details of each relationship table
    console.log('\n=== RELATIONSHIP TABLE STRUCTURES ===');
    for (const table of relationTables) {
      const columns = await sourceDb.$queryRawUnsafe(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = '${table.table_name}'
        ORDER BY ordinal_position
      `) as any[];
      
      console.log(`\n${table.table_name}:`);
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
      
      // Get sample count
      const count = await sourceDb.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM ${table.table_name}
      `) as any[];
      console.log(`  Records: ${count[0].count}`);
    }
    
    // 5. Service components
    console.log('\n=== SERVICE COMPONENTS ===');
    const serviceComponents = await sourceDb.$queryRaw`
      SELECT DISTINCT component_type, COUNT(*) as count
      FROM services_components
      GROUP BY component_type
      ORDER BY component_type
    ` as any[];
    
    if (serviceComponents.length > 0) {
      console.log('Service component types:');
      serviceComponents.forEach(comp => {
        console.log(`  - ${comp.component_type}: ${comp.count} instances`);
      });
    } else {
      console.log('No service components found');
    }
    
    // 6. Files related to services
    console.log('\n=== SERVICE FILES ===');
    const serviceFiles = await sourceDb.$queryRaw`
      SELECT field, COUNT(*) as count
      FROM files_related_morphs
      WHERE related_type = 'api::service.service'
      GROUP BY field
    ` as any[];
    
    if (serviceFiles.length > 0) {
      console.log('Service file fields:');
      serviceFiles.forEach(field => {
        console.log(`  - ${field.field}: ${field.count} files`);
      });
    }
    
    // 7. Service-Freelancer relationship
    console.log('\n=== SERVICE-FREELANCER RELATIONSHIP ===');
    const serviceFreelancerLink = await sourceDb.$queryRaw`
      SELECT 
        COUNT(DISTINCT service_id) as unique_services,
        COUNT(DISTINCT freelancer_id) as unique_freelancers,
        COUNT(*) as total_links
      FROM services_freelancer_links
    ` as any[];
    
    console.log(`Service-Freelancer links:`);
    console.log(`  - Unique services: ${serviceFreelancerLink[0].unique_services}`);
    console.log(`  - Unique freelancers: ${serviceFreelancerLink[0].unique_freelancers}`);
    console.log(`  - Total links: ${serviceFreelancerLink[0].total_links}`);
    
    // 8. Sample service data
    console.log('\n=== SAMPLE SERVICE DATA ===');
    const sampleServices = await sourceDb.$queryRaw`
      SELECT 
        s.*,
        sfl.freelancer_id
      FROM services s
      LEFT JOIN services_freelancer_links sfl ON s.id = sfl.service_id
      LIMIT 3
    ` as any[];
    
    console.log('Sample services (first 3):');
    sampleServices.forEach((service, index) => {
      console.log(`\nService ${index + 1}:`);
      console.log(`  ID: ${service.id}`);
      console.log(`  Title: ${service.title || 'N/A'}`);
      console.log(`  Description: ${service.description ? service.description.substring(0, 100) + '...' : 'N/A'}`);
      console.log(`  Freelancer ID: ${service.freelancer_id || 'N/A'}`);
      console.log(`  Published: ${service.published_at ? 'Yes' : 'No'}`);
      console.log(`  Created: ${service.created_at}`);
    });
    
    // 9. Service taxonomy relationships
    console.log('\n=== SERVICE TAXONOMY RELATIONSHIPS ===');
    const taxonomyTables = [
      'services_category_links',
      'services_subcategory_links',
      'services_specialization_links',
      'services_size_links',
      'services_min_budget_links',
      'services_contact_types_links',
      'services_payment_methods_links',
      'services_settlement_methods_links'
    ];
    
    for (const tableName of taxonomyTables) {
      try {
        const count = await sourceDb.$queryRawUnsafe(`
          SELECT COUNT(*) as count FROM ${tableName}
        `) as any[];
        console.log(`  ${tableName}: ${count[0].count} records`);
      } catch (error) {
        console.log(`  ${tableName}: Table not found or error`);
      }
    }
    
    // 10. Check for skills relationship
    console.log('\n=== SERVICE SKILLS ===');
    try {
      const skillsCount = await sourceDb.$queryRaw`
        SELECT COUNT(*) as count FROM skills_services_links
      ` as any[];
      console.log(`  skills_services_links: ${skillsCount[0].count} records`);
    } catch (error) {
      console.log('  skills_services_links: Not found');
    }
    
  } catch (error) {
    console.error('Error exploring services structure:', error);
  } finally {
    await sourceDb.$disconnect();
  }
}

// Run the exploration
exploreServicesStructure()
  .then(() => console.log('\n✅ Exploration complete!'))
  .catch(console.error);