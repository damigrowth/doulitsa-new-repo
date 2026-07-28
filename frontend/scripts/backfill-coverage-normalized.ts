/**
 * Backfill script to populate coverageNormalized field for existing profiles
 *
 * This script:
 * 1. Finds all profiles with coverage data
 * 2. Generates normalized coverage string using generateCoverageNormalized()
 * 3. Updates each profile with the new coverageNormalized field
 *
 * Run with: npx tsx scripts/backfill-coverage-normalized.ts
 */

import { prisma } from '../src/lib/prisma/client';
import { generateCoverageNormalized } from '../src/lib/utils/datasets';

async function backfillCoverageNormalized() {
  console.log('🚀 Starting coverage normalized backfill...\n');

  try {
    // Find all profiles with coverage data
    const profiles = await prisma.profile.findMany({
      where: {
        coverage: {
          not: null,
        },
      },
      select: {
        id: true,
        uid: true,
        username: true,
        coverage: true,
      },
    });

    console.log(`📊 Found ${profiles.length} profiles with coverage data\n`);

    if (profiles.length === 0) {
      console.log('✅ No profiles to backfill. Exiting.');
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ profileId: string; error: string }> = [];

    // Process each profile
    for (const profile of profiles) {
      try {
        // Generate normalized coverage
        const coverageNormalized = generateCoverageNormalized(profile.coverage as any);

        // Update profile
        await prisma.profile.update({
          where: { id: profile.id },
          data: { coverageNormalized },
        });

        successCount++;
        console.log(`✅ Updated profile: ${profile.username || profile.uid} (${profile.id})`);

        if (coverageNormalized) {
          console.log(`   Coverage: ${coverageNormalized.substring(0, 100)}${coverageNormalized.length > 100 ? '...' : ''}`);
        } else {
          console.log(`   Coverage: (empty - no valid locations)`);
        }
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({ profileId: profile.id, error: errorMessage });
        console.error(`❌ Failed to update profile ${profile.id}: ${errorMessage}`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 Backfill Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successful: ${successCount}/${profiles.length}`);
    console.log(`❌ Failed: ${errorCount}/${profiles.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(({ profileId, error }) => {
        console.log(`  - Profile ${profileId}: ${error}`);
      });
    }

    console.log('\n✨ Backfill completed!');
  } catch (error) {
    console.error('💥 Fatal error during backfill:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
backfillCoverageNormalized()
  .then(() => {
    console.log('\n👋 Disconnected from database');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Backfill failed:', error);
    process.exit(1);
  });
