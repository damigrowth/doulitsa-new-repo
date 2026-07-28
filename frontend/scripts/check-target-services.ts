/**
 * Check the current services table structure in the target (Neon) database
 */

import { PrismaClient as TargetPrismaClient } from '@prisma/client';

const targetDb = new TargetPrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function checkTargetServices() {
  try {
    console.log('🔍 Checking Target Services Structure...\n');
    
    // Check if services table exists
    const servicesTableExists = await targetDb.$queryRaw`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'services'
      )
    ` as any[];
    
    console.log(`Services table exists: ${servicesTableExists[0].exists}`);
    
    if (servicesTableExists[0].exists) {
      // Get table structure
      const columns = await targetDb.$queryRaw`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'services'
        ORDER BY ordinal_position
      ` as any[];
      
      console.log('\nServices table structure:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
      
      // Count existing services
      const count = await targetDb.$queryRaw`
        SELECT COUNT(*) as count FROM services
      ` as any[];
      
      console.log(`\nExisting services: ${count[0].count}`);
      
      if (count[0].count > 0) {
        // Sample service
        const sample = await targetDb.$queryRaw`
          SELECT * FROM services LIMIT 1
        ` as any[];
        
        console.log('\nSample service:');
        const service = sample[0];
        Object.keys(service).forEach(key => {
          console.log(`  ${key}: ${service[key]}`);
        });
      }
    } else {
      console.log('\nServices table does not exist in target database yet.');
    }
    
  } catch (error) {
    console.error('Error checking target services:', error);
  } finally {
    await targetDb.$disconnect();
  }
}

// Run the check
checkTargetServices()
  .then(() => console.log('\n✅ Target check complete!'))
  .catch(console.error);