/**
 * UPDATE MIGRATED USER ROLES
 * 
 * Updates the roles for users that were already migrated with the default 'user' role
 * by looking up their original roles from Strapi and updating them in Neon.
 */

import { PrismaClient as SourcePrismaClient } from '@prisma/client';
import { PrismaClient as TargetPrismaClient } from '@prisma/client';

const sourceDb = new SourcePrismaClient({
  datasources: {
    db: {
      url: process.env.SOURCE_DATABASE_URL
    }
  }
});

const targetDb = new TargetPrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

interface RoleUpdateStats {
  totalUsers: number;
  usersUpdated: number;
  skipped: number;
  errors: string[];
  roleUpdates: Record<string, number>;
}

async function getStrapiUserRole(email: string): Promise<string | null> {
  try {
    const result = await sourceDb.$queryRaw<{role_type: string}[]>`
      SELECT r.type as role_type
      FROM up_users u
      JOIN up_users_role_links url ON u.id = url.user_id
      JOIN up_roles r ON url.role_id = r.id
      WHERE u.email = ${email}
      LIMIT 1
    `;

    if (result.length === 0) {
      return null;
    }

    const strapiRole = result[0].role_type;
    
    // Map Strapi roles to Better-Auth roles
    switch(strapiRole.toLowerCase()) {
      case 'freelancer':
        return 'freelancer';
      case 'company':
        return 'company';
      case 'employer':
        return 'company'; // Map employer to company
      case 'authenticated':
      case 'public':
      default:
        return 'user';
    }
  } catch (error) {
    console.error(`Error getting role for ${email}:`, error);
    return null;
  }
}

async function updateMigratedUserRoles(): Promise<RoleUpdateStats> {
  const stats: RoleUpdateStats = {
    totalUsers: 0,
    usersUpdated: 0,
    skipped: 0,
    errors: [],
    roleUpdates: {
      user: 0,
      freelancer: 0,
      company: 0
    }
  };

  try {
    console.log('🔄 Starting role update for migrated users...');

    // Connect to both databases
    await sourceDb.$connect();
    await targetDb.$connect();
    console.log('✅ Database connections established');

    // Get all users from target database that need role updates
    // We'll focus on users that have the default 'user' role but might need different roles
    const usersToUpdate = await targetDb.user.findMany({
      select: {
        id: true,
        email: true,
        role: true
      },
      where: {
        // Get all users to check their roles, not just those with 'user' role
        // in case some were migrated incorrectly
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    stats.totalUsers = usersToUpdate.length;
    console.log(`📊 Found ${stats.totalUsers} users to check`);

    for (let i = 0; i < usersToUpdate.length; i++) {
      const user = usersToUpdate[i];
      const progress = `[${i + 1}/${stats.totalUsers}]`;

      try {
        console.log(`${progress} Checking user: ${user.email} (current: ${user.role})`);

        // Get the correct role from Strapi
        const correctRole = await getStrapiUserRole(user.email);

        if (!correctRole) {
          console.log(`⚠️ ${progress} No role found in Strapi for ${user.email}, skipping`);
          stats.skipped++;
          continue;
        }

        // Check if role needs updating
        if (user.role === correctRole) {
          console.log(`✅ ${progress} Role already correct (${correctRole})`);
          stats.skipped++;
          continue;
        }

        // Update the user's role
        await targetDb.user.update({
          where: { id: user.id },
          data: { role: correctRole }
        });

        stats.usersUpdated++;
        stats.roleUpdates[correctRole]++;
        console.log(`🔄 ${progress} Updated ${user.email}: ${user.role} → ${correctRole}`);

      } catch (error) {
        const errorMsg = `${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        stats.errors.push(errorMsg);
        console.error(`❌ ${progress} Error updating ${user.email}:`, error);
      }
    }

    // Print summary
    console.log('\n📊 ROLE UPDATE SUMMARY');
    console.log('====================');
    console.log(`Total users checked: ${stats.totalUsers}`);
    console.log(`Users updated: ${stats.usersUpdated}`);
    console.log(`Skipped (already correct/no role found): ${stats.skipped}`);
    console.log(`Errors: ${stats.errors.length}`);

    console.log('\n📈 ROLE UPDATES:');
    Object.entries(stats.roleUpdates).forEach(([role, count]) => {
      if (count > 0) {
        console.log(`  ${role}: ${count} users`);
      }
    });

    if (stats.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      stats.errors.forEach(error => console.log(`  - ${error}`));
    }

    console.log('\n🎉 Role update completed!');
    return stats;

  } catch (error) {
    console.error('💥 Fatal error during role update:', error);
    throw error;
  } finally {
    await sourceDb.$disconnect();
    await targetDb.$disconnect();
    console.log('🔌 Database connections closed');
  }
}

// Test function to verify role updates
async function verifyRoleUpdates(): Promise<void> {
  try {
    console.log('🔍 Verifying role updates...');
    
    await targetDb.$connect();

    const roleCounts = await targetDb.user.groupBy({
      by: ['role'],
      _count: {
        role: true
      }
    });

    console.log('\n📊 CURRENT ROLE DISTRIBUTION:');
    roleCounts.forEach(count => {
      console.log(`  ${count.role}: ${count._count.role} users`);
    });

    // Sample users by role
    console.log('\n👤 SAMPLE USERS BY ROLE:');
    for (const roleCount of roleCounts) {
      const sampleUsers = await targetDb.user.findMany({
        where: { role: roleCount.role },
        select: { email: true, role: true },
        take: 3
      });

      console.log(`\n  ${roleCount.role.toUpperCase()}:`);
      sampleUsers.forEach(user => {
        console.log(`    - ${user.email}`);
      });
    }

  } catch (error) {
    console.error('❌ Verification error:', error);
  } finally {
    await targetDb.$disconnect();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args[0] === 'verify') {
    await verifyRoleUpdates();
    return;
  }
  
  // Run the role update
  const stats = await updateMigratedUserRoles();
  
  // Exit with appropriate code
  process.exit(stats.errors.length > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch(console.error);
}

export { updateMigratedUserRoles, verifyRoleUpdates };