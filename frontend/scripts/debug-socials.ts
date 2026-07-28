/**
 * DEBUG SCRIPT - Social Media Components Analysis
 * 
 * This script analyzes the actual structure of social media data in Strapi
 * to understand why the migration isn't picking up URLs
 */

import { PrismaClient as SourcePrismaClient } from '@prisma/client';

// Database connection to source (Strapi)
const sourceDb = new SourcePrismaClient({
  datasources: {
    db: {
      url: process.env.SOURCE_DATABASE_URL, // DigitalOcean PostgreSQL
    },
  },
});

// Debug function to examine social components structure
async function debugSocialComponents() {
  try {
    console.log('🔍 DEBUGGING SOCIAL MEDIA COMPONENTS');
    console.log('=====================================');

    await sourceDb.$connect();

    // 1. Check what social component types exist
    console.log('\n1. Available social component types:');
    const componentTypes = await sourceDb.$queryRaw`
      SELECT DISTINCT component_type 
      FROM freelancers_components 
      WHERE component_type LIKE 'socials.%'
      ORDER BY component_type
    ` as any[];
    
    console.log(componentTypes.map(ct => ct.component_type));

    // 2. Check the actual table structures
    console.log('\n2. Social component table structures:');
    
    const tables = [
      'components_socials_facebooks',
      'components_socials_instagrams', 
      'components_socials_linkedins',
      'components_socials_xes',
      'components_socials_githubs',
      'components_socials_behances',
      'components_socials_dribbbles',
      'components_socials_you_tubes'
    ];

    for (const table of tables) {
      try {
        const columns = await sourceDb.$queryRaw`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = ${table}
          ORDER BY ordinal_position
        ` as any[];
        
        console.log(`\n${table}:`);
        console.log(columns.map(col => `  ${col.column_name}: ${col.data_type}`).join('\n'));
        
        // Get sample data
        const sampleData = await sourceDb.$queryRaw`
          SELECT * FROM ${table} LIMIT 3
        ` as any[];
        
        if (sampleData.length > 0) {
          console.log('  Sample data:');
          sampleData.forEach((row, i) => {
            console.log(`    [${i + 1}] ${JSON.stringify(row)}`);
          });
        } else {
          console.log('  No data found');
        }
      } catch (error) {
        console.log(`  ${table}: Table does not exist or access denied`);
      }
    }

    // 3. Check freelancer-social component relationships
    console.log('\n3. Freelancer social component relationships:');
    const relationships = await sourceDb.$queryRaw`
      SELECT 
        fc.component_type,
        COUNT(*) as count
      FROM freelancers_components fc
      WHERE fc.component_type LIKE 'socials.%'
      GROUP BY fc.component_type
      ORDER BY count DESC
    ` as any[];

    console.log('Social component usage:');
    relationships.forEach(rel => {
      console.log(`  ${rel.component_type}: ${rel.count} freelancers`);
    });

    // 4. Try to get actual social data with the current query approach
    console.log('\n4. Testing current query approach:');
    
    const testFreelancerIds = await sourceDb.$queryRaw`
      SELECT DISTINCT entity_id as freelancer_id 
      FROM freelancers_components 
      WHERE component_type LIKE 'socials.%' 
      LIMIT 5
    ` as any[];

    if (testFreelancerIds.length > 0) {
      const testIds = testFreelancerIds.map(f => f.freelancer_id);
      console.log(`Testing with freelancer IDs: ${testIds.join(', ')}`);

      const socialComponents = await sourceDb.$queryRaw`
        SELECT 
          fc.entity_id as freelancer_id,
          fc.component_type,
          fc.component_id,
          CASE fc.component_type
            WHEN 'socials.facebook' THEN row_to_json(cf.*)
            WHEN 'socials.instagram' THEN row_to_json(ci.*)
            WHEN 'socials.linkedin' THEN row_to_json(cl.*)
            WHEN 'socials.x' THEN row_to_json(cx.*)
            WHEN 'socials.github' THEN row_to_json(cg.*)
            WHEN 'socials.behance' THEN row_to_json(cb.*)
            WHEN 'socials.dribbble' THEN row_to_json(cd.*)
            WHEN 'socials.youTube' THEN row_to_json(cy.*)
            ELSE NULL
          END as component_data
        FROM freelancers_components fc
        LEFT JOIN components_socials_facebooks cf ON fc.component_type = 'socials.facebook' AND fc.component_id = cf.id
        LEFT JOIN components_socials_instagrams ci ON fc.component_type = 'socials.instagram' AND fc.component_id = ci.id
        LEFT JOIN components_socials_linkedins cl ON fc.component_type = 'socials.linkedin' AND fc.component_id = cl.id
        LEFT JOIN components_socials_xes cx ON fc.component_type = 'socials.x' AND fc.component_id = cx.id
        LEFT JOIN components_socials_githubs cg ON fc.component_type = 'socials.github' AND fc.component_id = cg.id
        LEFT JOIN components_socials_behances cb ON fc.component_type = 'socials.behance' AND fc.component_id = cb.id
        LEFT JOIN components_socials_dribbbles cd ON fc.component_type = 'socials.dribbble' AND fc.component_id = cd.id
        LEFT JOIN components_socials_you_tubes cy ON fc.component_type = 'socials.youTube' AND fc.component_id = cy.id
        WHERE fc.entity_id = ANY(${testIds})
          AND fc.component_type LIKE 'socials.%'
          AND fc.component_type != 'socials.list'
        ORDER BY fc.entity_id, fc.component_type
      ` as any[];

      console.log('\nSocial components query results:');
      socialComponents.forEach(comp => {
        console.log(`  Freelancer ${comp.freelancer_id} - ${comp.component_type}:`);
        console.log(`    Component ID: ${comp.component_id}`);
        console.log(`    Data: ${JSON.stringify(comp.component_data)}`);
      });
    } else {
      console.log('No freelancers found with social components');
    }

    // 5. Check the actual socials.list table structure and data
    console.log('\n5. Checking components_socials_lists table:');
    
    try {
      // First check table structure
      const socialsListColumns = await sourceDb.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'components_socials_lists'
        ORDER BY ordinal_position
      ` as any[];
      
      console.log('components_socials_lists table structure:');
      socialsListColumns.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Then get sample data
      const socialsList = await sourceDb.$queryRaw`
        SELECT 
          fc.entity_id as freelancer_id,
          fc.component_id,
          sl.*
        FROM freelancers_components fc
        JOIN components_socials_lists sl ON fc.component_id = sl.id
        WHERE fc.component_type = 'socials.list'
        LIMIT 5
      ` as any[];

      if (socialsList.length > 0) {
        console.log('\nsocials.list data found:');
        socialsList.forEach(social => {
          console.log(`  Freelancer ${social.freelancer_id}:`);
          console.log(`    ${JSON.stringify(social, null, 2)}`);
        });
      } else {
        console.log('\nNo socials.list components found');
      }
      
      // Check if there are any socials.list components at all
      const totalSocialsList = await sourceDb.$queryRaw`
        SELECT COUNT(*) as count FROM components_socials_lists
      ` as any[];
      
      console.log(`\nTotal records in components_socials_lists: ${totalSocialsList[0]?.count || 0}`);
      
      // Let's check if there are any other social-related tables
      console.log('\n6. Looking for other social-related tables:');
      const socialTables = await sourceDb.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name LIKE '%social%'
        ORDER BY table_name
      ` as any[];
      
      console.log('Social-related tables found:');
      socialTables.forEach(table => {
        console.log(`  ${table.table_name}`);
      });
      
      // Let's also check if there are component relations for socials.list
      console.log('\n7. Checking for component relations to socials.list:');
      const componentRelations = await sourceDb.$queryRaw`
        SELECT table_name, column_name
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND (column_name LIKE '%socials_list%' OR column_name LIKE '%social%')
        ORDER BY table_name, column_name
      ` as any[];
      
      if (componentRelations.length > 0) {
        console.log('Tables with social-related columns:');
        componentRelations.forEach(rel => {
          console.log(`  ${rel.table_name}.${rel.column_name}`);
        });
      }
      
      // Check if the socials data might be in a junction table or components relation
      console.log('\n8. Checking for social platform data in component relations:');
      try {
        const socialPlatforms = await sourceDb.$queryRaw`
          SELECT t.table_name, t.column_name, t.data_type
          FROM information_schema.tables tb
          JOIN information_schema.columns t ON tb.table_name = t.table_name
          WHERE tb.table_schema = 'public' 
            AND (tb.table_name LIKE '%socials%' OR tb.table_name LIKE '%social%')
            AND t.table_schema = 'public'
            AND t.column_name != 'id'
          ORDER BY t.table_name, t.ordinal_position
        ` as any[];
        
        if (socialPlatforms.length > 0) {
          console.log('All social-related table columns:');
          let currentTable = '';
          socialPlatforms.forEach(col => {
            if (col.table_name !== currentTable) {
              console.log(`\n  ${col.table_name}:`);
              currentTable = col.table_name;
            }
            console.log(`    ${col.column_name}: ${col.data_type}`);
          });
        }
      } catch (error) {
        console.log('Error checking social platform data:', error);
      }
      
      // Now let's trace the actual relationship and get real social URLs
      console.log('\n9. Tracing the actual social media relationships:');
      try {
        const socialUrls = await sourceDb.$queryRaw`
          SELECT 
            fc.entity_id as freelancer_id,
            fc.component_id as socials_list_id,
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
            AND fc.entity_id IN (SELECT DISTINCT entity_id FROM freelancers_components WHERE component_type = 'socials.list' LIMIT 3)
          ORDER BY fc.entity_id, slc.component_type
        ` as any[];

        if (socialUrls.length > 0) {
          console.log('✅ FOUND ACTUAL SOCIAL MEDIA URLS:');
          let currentFreelancer = null;
          socialUrls.forEach(social => {
            if (social.freelancer_id !== currentFreelancer) {
              console.log(`\n  Freelancer ${social.freelancer_id}:`);
              currentFreelancer = social.freelancer_id;
            }
            const platformData = social.platform_data;
            console.log(`    ${social.platform_type}: ${JSON.stringify(platformData)}`);
          });
        } else {
          console.log('❌ No social URLs found through relationship tracing');
        }
        
      } catch (error) {
        console.log('Error tracing social relationships:', error);
      }
      
    } catch (error) {
      console.log('Error checking socials.list table:', error);
    }

  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await sourceDb.$disconnect();
  }
}

// Main execution
async function main() {
  await debugSocialComponents();
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled rejection:', error);
  process.exit(1);
});

if (require.main === module) {
  main().catch(console.error);
}

export { debugSocialComponents };