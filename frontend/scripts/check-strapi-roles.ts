/**
 * STRAPI ROLE CHECKER
 * 
 * Analyzes the Strapi database to understand how user roles were stored
 * so we can update the migration script with proper role mapping.
 */

import { PrismaClient } from '@prisma/client';

const sourceDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.SOURCE_DATABASE_URL // DigitalOcean PostgreSQL
    }
  }
});

async function checkStrapiRoles() {
  try {
    console.log('🔍 Analyzing Strapi database structure...');
    
    await sourceDb.$connect();
    console.log('✅ Connected to Strapi database');

    // Check the up_users table structure
    console.log('\n📊 Analyzing up_users table...');
    const users = await sourceDb.$queryRaw<any[]>`
      SELECT 
        id,
        username,
        email,
        provider,
        created_at,
        updated_at,
        display_name,
        first_name,
        last_name
      FROM up_users 
      ORDER BY created_at ASC 
      LIMIT 10
    `;

    console.log(`Found ${users.length} sample users:`);
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (${user.provider}) - ID: ${user.id}`);
    });

    // Check for roles table
    console.log('\n🔍 Looking for roles-related tables...');
    
    try {
      const rolesTables = await sourceDb.$queryRaw<any[]>`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%role%'
        ORDER BY table_name
      `;
      
      if (rolesTables.length > 0) {
        console.log('📋 Found role-related tables:');
        rolesTables.forEach(table => {
          console.log(`  - ${table.table_name}`);
        });

        // Check up_roles table if it exists
        const roleTableExists = rolesTables.find(t => t.table_name === 'up_roles');
        if (roleTableExists) {
          console.log('\n📊 Analyzing up_roles table:');
          const roles = await sourceDb.$queryRaw<any[]>`
            SELECT * FROM up_roles ORDER BY id
          `;
          console.log('Available roles:');
          roles.forEach(role => {
            console.log(`  - ID: ${role.id}, Name: ${role.name}, Type: ${role.type}`);
          });
        }

        // Check for user-role relationships
        const userRoleTable = rolesTables.find(t => t.table_name.includes('user') && t.table_name.includes('role'));
        if (userRoleTable) {
          console.log(`\n🔗 Analyzing ${userRoleTable.table_name} relationships:`);
          const userRoles = await sourceDb.$queryRaw<any[]>`
            SELECT * FROM ${userRoleTable.table_name} LIMIT 10
          `;
          console.log('Sample user-role relationships:');
          userRoles.forEach(ur => {
            console.log(`  User ID: ${ur.user_id || ur.users_permissions_user_id}, Role ID: ${ur.role_id || ur.users_permissions_role_id}`);
          });
        }

      } else {
        console.log('❌ No role-related tables found');
      }
    } catch (error) {
      console.log('⚠️ Error checking role tables:', error.message);
    }

    // Check if roles are stored in the up_users table directly
    console.log('\n🔍 Checking if up_users has role-related columns...');
    try {
      const userColumns = await sourceDb.$queryRaw<any[]>`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'up_users' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `;
      
      console.log('📋 up_users table columns:');
      userColumns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });

      // Look for any role-related columns
      const roleColumns = userColumns.filter(col => 
        col.column_name.toLowerCase().includes('role') ||
        col.column_name.toLowerCase().includes('type') ||
        col.column_name.toLowerCase().includes('permission')
      );

      if (roleColumns.length > 0) {
        console.log('\n🎯 Found potential role-related columns:');
        roleColumns.forEach(col => {
          console.log(`  - ${col.column_name}: ${col.data_type}`);
        });

        // Sample values from role-related columns
        for (const col of roleColumns) {
          try {
            const samples = await sourceDb.$queryRaw<any[]>`
              SELECT DISTINCT ${col.column_name} as value, COUNT(*) as count
              FROM up_users 
              WHERE ${col.column_name} IS NOT NULL
              GROUP BY ${col.column_name}
              ORDER BY count DESC
            `;
            console.log(`\n  Values in ${col.column_name}:`);
            samples.forEach(sample => {
              console.log(`    - "${sample.value}": ${sample.count} users`);
            });
          } catch (error) {
            console.log(`    ⚠️ Error reading ${col.column_name}: ${error.message}`);
          }
        }
      }

    } catch (error) {
      console.log('⚠️ Error checking up_users columns:', error.message);
    }

    // Check all tables for potential role information
    console.log('\n🔍 Checking all tables for role-related data...');
    try {
      const allTables = await sourceDb.$queryRaw<any[]>`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;
      
      console.log('\n📋 All tables in database:');
      allTables.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });

    } catch (error) {
      console.log('⚠️ Error listing tables:', error.message);
    }

  } catch (error) {
    console.error('❌ Database analysis error:', error);
  } finally {
    await sourceDb.$disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

async function main() {
  await checkStrapiRoles();
}

if (require.main === module) {
  main().catch(console.error);
}

export { checkStrapiRoles };