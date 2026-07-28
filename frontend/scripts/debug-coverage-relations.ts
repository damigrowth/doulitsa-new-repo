/**
 * DEBUG SCRIPT - Location Coverage Relations Explorer
 * 
 * This script explores the Strapi database to understand the structure of 
 * location coverage components and their relationships with areas, counties, and zipcodes.
 */

import { PrismaClient } from '@prisma/client';

// Source database connection (Strapi)
const sourceDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.SOURCE_DATABASE_URL, // DigitalOcean PostgreSQL
    },
  },
});

async function debugCoverageRelations() {
  try {
    console.log('🔍 DEBUG: Exploring Location Coverage Relations');
    console.log('=================================================');
    
    await sourceDb.$connect();
    
    // Step 1: Find all tables related to location coverage components
    console.log('\n📋 Step 1: Finding location coverage related tables...');
    
    const coverageTables = await sourceDb.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE '%location%coverage%'
      ORDER BY table_name
    ` as any[];
    
    console.log('Coverage related tables:');
    coverageTables.forEach((table: any) => console.log(`  - ${table.table_name}`));
    
    // Step 2: Examine the main components_location_coverages table structure
    console.log('\n📋 Step 2: Examining components_location_coverages table structure...');
    
    const coverageColumns = await sourceDb.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'components_location_coverages'
      ORDER BY ordinal_position
    ` as any[];
    
    console.log('components_location_coverages columns:');
    coverageColumns.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(required)' : '(optional)'}`);
    });
    
    // Step 3: Find relationship tables for coverage components
    console.log('\n📋 Step 3: Finding relationship tables...');
    
    const relationTables = await sourceDb.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND (
          table_name LIKE '%coverage%links%' OR
          table_name LIKE '%coverage%area%' OR
          table_name LIKE '%coverage%county%' OR
          table_name LIKE '%coverage%zipcode%'
        )
      ORDER BY table_name
    ` as any[];
    
    console.log('Relationship tables:');
    relationTables.forEach((table: any) => console.log(`  - ${table.table_name}`));
    
    // Step 4: Examine each relationship table structure
    for (const table of relationTables) {
      console.log(`\n📋 Examining ${table.table_name} structure:`);
      
      const columns = await sourceDb.$queryRawUnsafe(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns 
         WHERE table_name = '${table.table_name}'
         ORDER BY ordinal_position`
      ) as any[];
      
      columns.forEach((col: any) => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(required)' : '(optional)'}`);
      });
      
      // Also get a sample of data from each table
      try {
        const sampleData = await sourceDb.$queryRawUnsafe(`SELECT * FROM ${table.table_name} LIMIT 3`) as any[];
        if (sampleData.length > 0) {
          console.log(`  📊 Sample data (${sampleData.length} rows):`);
          sampleData.forEach((row: any, index: number) => {
            console.log(`    ${index + 1}: ${JSON.stringify(row)}`);
          });
        } else {
          console.log(`  📊 No data in this table`);
        }
      } catch (error) {
        console.log(`  📊 Error getting sample data: ${(error as Error).message}`);
      }
    }
    
    // Step 5: Find sample coverage component data
    console.log('\n📋 Step 5: Finding sample coverage components...');
    
    const sampleComponents = await sourceDb.$queryRaw`
      SELECT fc.entity_id, fc.component_id, fc.component_type
      FROM freelancers_components fc
      WHERE fc.component_type = 'location.coverage'
      LIMIT 5
    ` as any[];
    
    console.log('Sample coverage components:');
    sampleComponents.forEach((comp: any) => {
      console.log(`  - Freelancer ${comp.entity_id}: Component ${comp.component_id}`);
    });
    
    if (sampleComponents.length > 0) {
      const sampleId = sampleComponents[0].component_id;
      console.log(`\n📋 Step 6: Examining sample component data (ID: ${sampleId})...`);
      
      // Get the base component data
      const baseData = await sourceDb.$queryRaw`
        SELECT * FROM components_location_coverages WHERE id = ${sampleId}
      ` as any[];
      
      console.log('Base component data:');
      if (baseData.length > 0) {
        console.log(JSON.stringify(baseData[0], null, 2));
      }
      
      // Check for relationship data in each potential table
      for (const table of relationTables) {
        console.log(`\n📋 Checking ${table.table_name} for component ${sampleId}:`);
        
        try {
          // Try different possible column names
          const possibleQueries = [
            `SELECT * FROM ${table.table_name} WHERE components_location_coverage_id = ${sampleId}`,
            `SELECT * FROM ${table.table_name} WHERE location_coverage_id = ${sampleId}`,
            `SELECT * FROM ${table.table_name} WHERE component_id = ${sampleId}`
          ];
          
          for (const query of possibleQueries) {
            try {
              const results = await sourceDb.$queryRawUnsafe(query) as any[];
              if (results.length > 0) {
                console.log(`  ✅ Query worked: ${query}`);
                console.log(`  📊 Found ${results.length} rows:`);
                results.forEach((row: any) => {
                  console.log(`    ${JSON.stringify(row)}`);
                });
                break;
              }
            } catch (error) {
              // Query failed, try next one
            }
          }
        } catch (error) {
          console.log(`  ❌ No data found`);
        }
      }
    }
    
    // Step 7: Check what taxonomies exist
    console.log('\n📋 Step 7: Checking available taxonomies...');
    
    const taxonomyTables = await sourceDb.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND (
          table_name LIKE '%area%' OR
          table_name LIKE '%county%' OR
          table_name LIKE '%counties%' OR
          table_name LIKE '%zipcode%'
        )
        AND table_name NOT LIKE '%link%'
        AND table_name NOT LIKE '%component%'
      ORDER BY table_name
    ` as any[];
    
    console.log('Available taxonomy tables:');
    taxonomyTables.forEach((table: any) => console.log(`  - ${table.table_name}`));
    
    console.log('\n✅ Debug exploration complete!');
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await sourceDb.$disconnect();
  }
}

// Run the debug script
if (require.main === module) {
  debugCoverageRelations().catch(console.error);
}

export { debugCoverageRelations };