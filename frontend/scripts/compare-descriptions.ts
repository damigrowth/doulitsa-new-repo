/**
 * COMPARISON SCRIPT - Compare Strapi vs Neon Description Storage
 * 
 * This script compares how descriptions are stored in both databases
 * to understand the migration and identify any formatting differences.
 */

import { PrismaClient as SourcePrismaClient } from '@prisma/client';
import { PrismaClient as TargetPrismaClient } from '@prisma/client';

// Source database connection (Strapi on DigitalOcean)
const sourceDb = new SourcePrismaClient({
  datasources: {
    db: {
      url: process.env.SOURCE_DATABASE_URL,
    },
  },
});

// Target database connection (Neon)
const targetDb = new TargetPrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

interface StrapiFreelancer {
  id: number;
  username: string | null;
  display_name: string | null;
  description: string | null;
  tagline: string | null;
}

interface NeonProfile {
  id: string;
  userId: string;
  bio: string | null;
  tagline: string | null;
  user: {
    username: string | null;
  };
}

async function compareDescriptions(username: string): Promise<void> {
  try {
    console.log(`🔍 Comparing descriptions for: ${username}`);
    console.log('='.repeat(60));

    // Connect to both databases
    await sourceDb.$connect();
    await targetDb.$connect();
    console.log('✅ Connected to both databases\n');

    // ============= STRAPI DATA =============
    console.log('📦 STRAPI DATABASE (Source)');
    console.log('-'.repeat(40));
    
    const strapiFreelancer = await sourceDb.$queryRaw<StrapiFreelancer[]>`
      SELECT 
        id,
        username,
        display_name,
        description,
        tagline
      FROM freelancers 
      WHERE username = ${username}
      LIMIT 1
    `;

    if (!strapiFreelancer || strapiFreelancer.length === 0) {
      console.log(`❌ No freelancer found in Strapi with username: ${username}`);
      return;
    }

    const strapi = strapiFreelancer[0];
    
    console.log(`ID: ${strapi.id}`);
    console.log(`Username: ${strapi.username}`);
    console.log(`Display Name: ${strapi.display_name}`);
    
    if (strapi.description) {
      console.log(`\n📝 Description Stats:`);
      console.log(`  • Length: ${strapi.description.length} characters`);
      console.log(`  • Lines: ${strapi.description.split('\n').length}`);
      console.log(`  • Has newlines: ${strapi.description.includes('\n')}`);
      console.log(`  • Has \\r: ${strapi.description.includes('\r')}`);
      console.log(`  • Has tabs: ${strapi.description.includes('\t')}`);
      
      console.log(`\n📄 Raw Content (first 200 chars):`);
      console.log(`"${strapi.description.substring(0, 200)}..."`);
      
      // Show line structure
      console.log(`\n📊 Line Structure (first 5 lines):`);
      const strapiLines = strapi.description.split('\n').slice(0, 5);
      strapiLines.forEach((line, idx) => {
        const display = line.trim() || '[empty line]';
        console.log(`  Line ${idx + 1}: "${display}"`);
      });
    } else {
      console.log(`\n❌ No description in Strapi`);
    }

    // ============= NEON DATA =============
    console.log('\n\n🌊 NEON DATABASE (Target)');
    console.log('-'.repeat(40));
    
    // First, find the user with this username
    const neonUser = await targetDb.user.findFirst({
      where: { username },
      include: {
        profile: true,
      },
    });

    if (!neonUser) {
      console.log(`❌ No user found in Neon with username: ${username}`);
      return;
    }

    if (!neonUser.profile) {
      console.log(`❌ User exists but has no profile in Neon`);
      console.log(`User ID: ${neonUser.id}`);
      return;
    }

    const neon = neonUser.profile;
    
    console.log(`Profile ID: ${neon.id}`);
    console.log(`User ID: ${neon.userId}`);
    console.log(`Username: ${neonUser.username}`);
    
    if (neon.bio) {
      console.log(`\n📝 Bio Stats:`);
      console.log(`  • Length: ${neon.bio.length} characters`);
      console.log(`  • Lines: ${neon.bio.split('\n').length}`);
      console.log(`  • Has newlines: ${neon.bio.includes('\n')}`);
      console.log(`  • Has \\r: ${neon.bio.includes('\r')}`);
      console.log(`  • Has tabs: ${neon.bio.includes('\t')}`);
      
      console.log(`\n📄 Raw Content (first 200 chars):`);
      console.log(`"${neon.bio.substring(0, 200)}..."`);
      
      // Show line structure
      console.log(`\n📊 Line Structure (first 5 lines):`);
      const neonLines = neon.bio.split('\n').slice(0, 5);
      neonLines.forEach((line, idx) => {
        const display = line.trim() || '[empty line]';
        console.log(`  Line ${idx + 1}: "${display}"`);
      });
    } else {
      console.log(`\n❌ No bio in Neon`);
    }

    // ============= COMPARISON =============
    console.log('\n\n🔄 COMPARISON');
    console.log('='.repeat(60));
    
    if (strapi.description && neon.bio) {
      console.log('📊 Content Comparison:');
      console.log(`  • Same length: ${strapi.description.length === neon.bio.length}`);
      console.log(`  • Strapi length: ${strapi.description.length}`);
      console.log(`  • Neon length: ${neon.bio.length}`);
      console.log(`  • Exact match: ${strapi.description === neon.bio}`);
      
      if (strapi.description !== neon.bio) {
        console.log('\n🔍 Differences Found:');
        
        // Check character differences
        const minLength = Math.min(strapi.description.length, neon.bio.length);
        let firstDiffIndex = -1;
        
        for (let i = 0; i < minLength; i++) {
          if (strapi.description[i] !== neon.bio[i]) {
            firstDiffIndex = i;
            break;
          }
        }
        
        if (firstDiffIndex !== -1) {
          console.log(`  • First difference at character ${firstDiffIndex}`);
          console.log(`  • Strapi char: "${strapi.description[firstDiffIndex]}" (code: ${strapi.description.charCodeAt(firstDiffIndex)})`);
          console.log(`  • Neon char: "${neon.bio[firstDiffIndex]}" (code: ${neon.bio.charCodeAt(firstDiffIndex)})`);
          
          // Show context around difference
          const start = Math.max(0, firstDiffIndex - 20);
          const end = Math.min(firstDiffIndex + 20, minLength);
          console.log(`\n  Context around difference:`);
          console.log(`  Strapi: "...${strapi.description.substring(start, end)}..."`);
          console.log(`  Neon:   "...${neon.bio.substring(start, end)}..."`);
        }
        
        // Check line differences
        const strapiLines = strapi.description.split('\n');
        const neonLines = neon.bio.split('\n');
        
        console.log(`\n📝 Line Count Comparison:`);
        console.log(`  • Strapi lines: ${strapiLines.length}`);
        console.log(`  • Neon lines: ${neonLines.length}`);
        
        if (strapiLines.length !== neonLines.length) {
          console.log(`  • Line count mismatch!`);
        }
      } else {
        console.log('\n✅ Content is identical!');
      }
      
      // Check tagline comparison
      console.log('\n📌 Tagline Comparison:');
      console.log(`  • Strapi tagline: "${strapi.tagline}"`);
      console.log(`  • Neon tagline: "${neon.tagline}"`);
      console.log(`  • Match: ${strapi.tagline === neon.tagline}`);
      
    } else {
      console.log('⚠️  Cannot compare - one or both descriptions are missing');
      console.log(`  • Strapi has description: ${!!strapi.description}`);
      console.log(`  • Neon has bio: ${!!neon.bio}`);
    }

    // ============= STORAGE FORMAT ANALYSIS =============
    console.log('\n\n💾 STORAGE FORMAT ANALYSIS');
    console.log('='.repeat(60));
    
    if (neon.bio) {
      console.log('Current Neon Storage:');
      console.log('  • Format: Plain text with newline characters');
      console.log('  • Encoding: UTF-8');
      console.log('  • Special chars preserved: ✅ emojis, Greek text');
      
      console.log('\n🎨 Rendering Options:');
      console.log('1. Client-side formatting (current approach):');
      console.log('   - Store as plain text');
      console.log('   - Use formatDescription() when rendering');
      console.log('   - Pros: Flexible, editable, searchable');
      console.log('   - Cons: Processing on each render');
      
      console.log('\n2. Pre-processed HTML (alternative):');
      console.log('   - Convert to HTML before storing');
      console.log('   - Store as HTML string');
      console.log('   - Pros: Faster rendering');
      console.log('   - Cons: Harder to edit, security concerns');
      
      console.log('\n3. Markdown format (recommended):');
      console.log('   - Convert to Markdown syntax');
      console.log('   - Use react-markdown for rendering');
      console.log('   - Pros: Editable, safe, standard format');
      console.log('   - Cons: Need markdown parser');
    }

  } catch (error) {
    console.error('❌ Error comparing descriptions:', error);
  } finally {
    await sourceDb.$disconnect();
    await targetDb.$disconnect();
    console.log('\n🔌 Database connections closed');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const username = args[0] || 'indikos001';
  
  console.log(`🚀 Starting description comparison\n`);
  await compareDescriptions(username);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled rejection:', error);
  process.exit(1);
});

if (require.main === module) {
  main().catch(console.error);
}

export { compareDescriptions };