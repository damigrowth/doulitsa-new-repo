/**
 * USER ROLE RELATIONSHIP CHECKER
 * 
 * Checks the up_users_role_links table to understand how users are assigned roles
 */

import { PrismaClient } from '@prisma/client';

const sourceDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.SOURCE_DATABASE_URL
    }
  }
});

async function checkUserRoles() {
  try {
    console.log('🔍 Analyzing user-role relationships...');
    
    await sourceDb.$connect();
    console.log('✅ Connected to Strapi database');

    // Check the up_users_role_links table structure
    console.log('\n📊 Analyzing up_users_role_links table...');
    const userRoleLinks = await sourceDb.$queryRaw<any[]>`
      SELECT 
        user_id,
        role_id,
        COUNT(*) as count
      FROM up_users_role_links 
      GROUP BY user_id, role_id
      ORDER BY user_id
      LIMIT 20
    `;

    console.log('Sample user-role assignments:');
    userRoleLinks.forEach(link => {
      console.log(`  User ID: ${link.user_id}, Role ID: ${link.role_id}`);
    });

    // Get role distribution
    console.log('\n📈 Role distribution across all users:');
    const roleDistribution = await sourceDb.$queryRaw<any[]>`
      SELECT 
        r.id as role_id,
        r.name as role_name,
        r.type as role_type,
        COUNT(url.user_id) as user_count
      FROM up_roles r
      LEFT JOIN up_users_role_links url ON r.id = url.role_id
      GROUP BY r.id, r.name, r.type
      ORDER BY user_count DESC
    `;

    roleDistribution.forEach(role => {
      console.log(`  📋 ${role.role_name} (${role.role_type}): ${role.user_count} users`);
    });

    // Get specific user examples with their roles
    console.log('\n👤 Sample users with their roles:');
    const usersWithRoles = await sourceDb.$queryRaw<any[]>`
      SELECT 
        u.id,
        u.email,
        u.display_name,
        r.name as role_name,
        r.type as role_type
      FROM up_users u
      JOIN up_users_role_links url ON u.id = url.user_id
      JOIN up_roles r ON url.role_id = r.id
      ORDER BY u.id
      LIMIT 15
    `;

    usersWithRoles.forEach(user => {
      console.log(`  👤 ${user.email} → ${user.role_name} (${user.role_type})`);
    });

    // Check for users without roles
    console.log('\n⚠️  Checking for users without roles:');
    const usersWithoutRoles = await sourceDb.$queryRaw<any[]>`
      SELECT 
        u.id,
        u.email,
        u.display_name
      FROM up_users u
      LEFT JOIN up_users_role_links url ON u.id = url.user_id
      WHERE url.user_id IS NULL
      LIMIT 10
    `;

    if (usersWithoutRoles.length > 0) {
      console.log('Users without roles:');
      usersWithoutRoles.forEach(user => {
        console.log(`  ❌ ${user.email} (ID: ${user.id})`);
      });
    } else {
      console.log('✅ All users have roles assigned');
    }

    // Generate mapping recommendations
    console.log('\n💡 ROLE MAPPING RECOMMENDATIONS:');
    console.log('Based on your Strapi roles, here\'s the suggested mapping:');
    
    roleDistribution.forEach(role => {
      let betterAuthRole = 'user'; // default
      
      switch(role.role_type.toLowerCase()) {
        case 'freelancer':
          betterAuthRole = 'freelancer';
          break;
        case 'company':
          betterAuthRole = 'company';
          break;
        case 'employer':
          betterAuthRole = 'company'; // or 'employer' if you want to keep it
          break;
        case 'authenticated':
        case 'public':
        default:
          betterAuthRole = 'user';
          break;
      }
      
      console.log(`  📋 Strapi "${role.role_name}" (${role.role_type}) → Better-Auth "${betterAuthRole}"`);
    });

  } catch (error) {
    console.error('❌ Analysis error:', error);
  } finally {
    await sourceDb.$disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

async function main() {
  await checkUserRoles();
}

if (require.main === module) {
  main().catch(console.error);
}

export { checkUserRoles };