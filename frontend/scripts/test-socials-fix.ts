/**
 * TEST SCRIPT - Social Media Extraction Fix
 * 
 * This script tests the fixed fetchFreelancerSocials function
 * to verify social URLs are now being extracted correctly
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

// Copy of the fixed fetchFreelancerSocials function
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

// Test function
async function testSocialExtraction() {
  try {
    console.log('🧪 TESTING SOCIAL MEDIA EXTRACTION FIX');
    console.log('=====================================');

    await sourceDb.$connect();

    // Get freelancers that have social components
    const freelancersWithSocials = await sourceDb.$queryRaw`
      SELECT DISTINCT fc.entity_id as freelancer_id
      FROM freelancers_components fc
      WHERE fc.component_type = 'socials.list'
      LIMIT 5
    ` as any[];

    const testIds = freelancersWithSocials.map(f => f.freelancer_id);
    console.log(`\n📋 Testing with freelancer IDs: ${testIds.join(', ')}`);

    // Test the fixed function
    const socialMediaMap = await fetchFreelancerSocials(testIds);

    console.log(`\n✅ Social media extraction results:`);
    console.log(`📊 Total freelancers processed: ${socialMediaMap.size}`);

    let urlCount = 0;
    socialMediaMap.forEach((socials, freelancerId) => {
      console.log(`\n👤 Freelancer ${freelancerId}:`);
      
      const platforms = Object.keys(socials).filter(platform => socials[platform] !== null);
      if (platforms.length > 0) {
        platforms.forEach(platform => {
          console.log(`  ${platform}: ${socials[platform]}`);
          urlCount++;
        });
      } else {
        console.log(`  No social media URLs found`);
      }
    });

    console.log(`\n📈 SUMMARY:`);
    console.log(`  Total URLs extracted: ${urlCount}`);
    console.log(`  Freelancers with social data: ${socialMediaMap.size}`);

    // Test the final format that goes into migration
    if (socialMediaMap.size > 0) {
      const sampleFreelancerId = socialMediaMap.keys().next().value;
      const sampleSocials = socialMediaMap.get(sampleFreelancerId);
      
      const finalSocialsData = {
        facebook: sampleSocials.facebook || null,
        instagram: sampleSocials.instagram || null,
        linkedin: sampleSocials.linkedin || null,
        x: sampleSocials.twitter || null,
        youtube: sampleSocials.youtube || null,
        github: sampleSocials.github || null,
        behance: sampleSocials.behance || null,
        dribbble: sampleSocials.dribbble || null
      };

      console.log(`\n🎯 Final socials format for freelancer ${sampleFreelancerId}:`);
      console.log(JSON.stringify(finalSocialsData, null, 2));
    }

    console.log('\n🎉 Social media extraction test completed successfully!');

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await sourceDb.$disconnect();
  }
}

// Main execution
async function main() {
  await testSocialExtraction();
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled rejection:', error);
  process.exit(1);
});

if (require.main === module) {
  main().catch(console.error);
}

export { testSocialExtraction };