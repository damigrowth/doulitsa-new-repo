/**
 * Check service status mapping
 */

import { PrismaClient as SourcePrismaClient } from '@prisma/client';

const sourceDb = new SourcePrismaClient({
  datasources: {
    db: {
      url: process.env.SOURCE_DATABASE_URL,
    },
  },
});

async function checkServiceStatus() {
  try {
    console.log('🔍 Checking Service Status Mapping...\n');
    
    // Get all statuses
    const statuses = await sourceDb.$queryRaw`
      SELECT * FROM statuses ORDER BY id
    ` as any[];
    
    console.log('Available statuses:');
    statuses.forEach(status => {
      console.log(`  ${status.id}: ${status.type}`);
    });
    
    // Get service status distribution
    const statusDistribution = await sourceDb.$queryRaw`
      SELECT 
        s.type as status_type,
        COUNT(ssl.service_id) as service_count
      FROM statuses s
      LEFT JOIN services_status_links ssl ON s.id = ssl.status_id
      GROUP BY s.id, s.type
      ORDER BY s.id
    ` as any[];
    
    console.log('\nService status distribution:');
    statusDistribution.forEach(dist => {
      console.log(`  ${dist.status_type}: ${dist.service_count} services`);
    });
    
    // Sample services with their status
    const servicesWithStatus = await sourceDb.$queryRaw`
      SELECT 
        s.id,
        s.title,
        s.published_at,
        st.type as status_type
      FROM services s
      LEFT JOIN services_status_links ssl ON s.id = ssl.service_id
      LEFT JOIN statuses st ON ssl.status_id = st.id
      LIMIT 10
    ` as any[];
    
    console.log('\nSample services with status:');
    servicesWithStatus.forEach(service => {
      console.log(`  ${service.id}: ${service.title?.substring(0, 30)}... | Status: ${service.status_type || 'No status'} | Published: ${service.published_at ? 'Yes' : 'No'}`);
    });
    
  } catch (error) {
    console.error('Error checking service status:', error);
  } finally {
    await sourceDb.$disconnect();
  }
}

checkServiceStatus()
  .then(() => console.log('\n✅ Status check complete!'))
  .catch(console.error);