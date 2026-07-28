/**
 * DEBUG SCRIPT - Check Strapi Description Field
 * 
 * This script connects to the source Strapi database and fetches
 * the description field for a specific freelancer to understand
 * the data format and content structure.
 */

import { PrismaClient as SourcePrismaClient } from '@prisma/client';

// Source database connection (Strapi)
const sourceDb = new SourcePrismaClient({
  datasources: {
    db: {
      url: process.env.SOURCE_DATABASE_URL, // DigitalOcean PostgreSQL
    },
  },
});

interface StrapiFreelancer {
  id: number;
  username: string | null;
  display_name: string | null;
  description: string | null;
  tagline: string | null;
  created_at: Date | null;
  updated_at: Date | null;
}

async function debugFreelancerDescription(username: string): Promise<void> {
  try {
    console.log(`🔍 Fetching description for freelancer: ${username}`);
    console.log('==========================================');

    // Connect to source database
    await sourceDb.$connect();
    console.log('✅ Connected to Strapi database');

    // Find freelancer by username
    const freelancer = await sourceDb.$queryRaw<StrapiFreelancer[]>`
      SELECT 
        id,
        username,
        display_name,
        description,
        tagline,
        created_at,
        updated_at
      FROM freelancers 
      WHERE username = ${username}
      LIMIT 1
    `;

    if (!freelancer || freelancer.length === 0) {
      console.log(`❌ No freelancer found with username: ${username}`);
      return;
    }

    const profile = freelancer[0];
    
    console.log('\n📋 FREELANCER INFO:');
    console.log(`ID: ${profile.id}`);
    console.log(`Username: ${profile.username}`);
    console.log(`Display Name: ${profile.display_name}`);
    console.log(`Created: ${profile.created_at}`);
    console.log(`Updated: ${profile.updated_at}`);

    console.log('\n📝 DESCRIPTION ANALYSIS:');
    console.log('========================');
    
    if (!profile.description) {
      console.log('❌ No description found');
    } else {
      console.log(`✅ Description found (${profile.description.length} characters)`);
      console.log('\n🔤 RAW DESCRIPTION:');
      console.log('-------------------');
      console.log(`"${profile.description}"`);
      
      console.log('\n🔍 CHARACTER ANALYSIS:');
      console.log('----------------------');
      console.log(`Length: ${profile.description.length}`);
      console.log(`Lines: ${profile.description.split('\n').length}`);
      
      // Check for special characters
      const hasNewlines = profile.description.includes('\n');
      const hasCarriageReturn = profile.description.includes('\r');
      const hasTabs = profile.description.includes('\t');
      
      console.log(`Contains newlines (\\n): ${hasNewlines}`);
      console.log(`Contains carriage return (\\r): ${hasCarriageReturn}`);
      console.log(`Contains tabs (\\t): ${hasTabs}`);
      
      if (hasNewlines) {
        console.log('\n📄 SPLIT BY LINES:');
        console.log('------------------');
        const lines = profile.description.split('\n');
        lines.forEach((line, index) => {
          console.log(`Line ${index + 1}: "${line}"`);
        });
      }
      
      // Show how formatDescription would process it
      console.log('\n🔄 HOW formatDescription WOULD PROCESS:');
      console.log('--------------------------------------');
      const lines = profile.description.split('\n');
      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (trimmedLine !== '') {
          console.log(`<p key="${index}">${trimmedLine}</p>`);
        } else {
          console.log(`<div key="${index}" className="line-break"></div>`);
        }
      });
    }

    console.log('\n📝 TAGLINE COMPARISON:');
    console.log('======================');
    if (profile.tagline) {
      console.log(`Tagline: "${profile.tagline}"`);
      console.log(`Tagline length: ${profile.tagline.length}`);
    } else {
      console.log('No tagline found');
    }

  } catch (error) {
    console.error('❌ Error fetching description:', error);
  } finally {
    await sourceDb.$disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const username = args[0] || 'indikos001';
  
  console.log(`🚀 Starting description debug for: ${username}`);
  await debugFreelancerDescription(username);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled rejection:', error);
  process.exit(1);
});

if (require.main === module) {
  main().catch(console.error);
}

export { debugFreelancerDescription };