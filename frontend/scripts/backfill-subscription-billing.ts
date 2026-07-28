/**
 * Backfill subscription.billing from profile.billing
 *
 * Run with: npx tsx scripts/backfill-subscription-billing.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Backfilling subscription billing data from profiles...\n');

  // Find all subscriptions with NULL billing that have associated profiles with billing data
  const subscriptions = await prisma.subscription.findMany({
    where: {
      billing: null,
    },
    include: {
      profile: {
        select: {
          id: true,
          displayName: true,
          billing: true,
        },
      },
    },
  });

  console.log(`Found ${subscriptions.length} subscriptions with NULL billing\n`);

  let updated = 0;
  let skipped = 0;

  for (const sub of subscriptions) {
    const profileBilling = sub.profile?.billing;

    if (profileBilling && typeof profileBilling === 'object' && Object.keys(profileBilling).length > 0) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { billing: profileBilling },
      });
      console.log(`✅ Updated subscription for profile: ${sub.profile?.displayName || sub.pid}`);
      console.log(`   Billing: ${JSON.stringify(profileBilling)}\n`);
      updated++;
    } else {
      console.log(`⏭️  Skipped subscription for profile: ${sub.profile?.displayName || sub.pid}`);
      console.log(`   Reason: Profile has no billing data\n`);
      skipped++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${subscriptions.length}`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
