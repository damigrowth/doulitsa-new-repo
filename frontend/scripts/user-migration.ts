/**
 * USER MIGRATION SCRIPT - Strapi to Better-Auth
 * 
 * Migrates users from DigitalOcean PostgreSQL (Strapi) to Neon PostgreSQL (Better-Auth)
 * 
 * FIELD MAPPING:
 * 
 * Strapi up_users → Better-Auth users + accounts
 * ├── id (int) → Generate new CUID for users.id
 * ├── username → users.username
 * ├── email → users.email (unique)
 * ├── provider → accounts.providerId
 * ├── password → accounts.password (bcrypt hash for local users)
 * ├── confirmed → users.confirmed + users.emailVerified
 * ├── blocked → users.blocked
 * ├── created_at → users.createdAt
 * ├── updated_at → users.updatedAt
 * ├── display_name → users.displayName
 * ├── first_name → users.firstName
 * └── last_name → users.lastName
 * 
 * NOTE: Profiles will be created later based on username
 * 
 * MIGRATION STRATEGY:
 * 1. Local users (provider='local'): Create User + Account with password
 * 2. Google users (provider='google'): Create User + Account without password
 * 3. Map user data to User table only (no profiles yet)
 * 4. Handle role assignment based on existing data patterns
 */

import { PrismaClient as SourcePrismaClient } from '@prisma/client';
import { PrismaClient as TargetPrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

// Types for source database (Strapi)
interface StrapiUser {
  id: number;
  username: string | null;
  email: string | null;
  provider: string | null;
  password: string | null;
  reset_password_token: string | null;
  confirmation_token: string | null;
  confirmed: boolean | null;
  blocked: boolean | null;
  created_at: Date | null;
  updated_at: Date | null;
  created_by_id: number | null;
  updated_by_id: number | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: bigint | null;
  address: string | null;
  consent: boolean | null;
}

// Database connections
const sourceDb = new SourcePrismaClient({
  datasources: {
    db: {
      url: process.env.SOURCE_DATABASE_URL // DigitalOcean PostgreSQL
    }
  }
});

const targetDb = new TargetPrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL // Neon PostgreSQL
    }
  }
});

// Migration statistics
interface MigrationStats {
  totalUsers: number;
  localUsers: number;
  googleUsers: number;
  migratedSuccessfully: number;
  usersUpdated: number;
  errors: string[];
  skipped: string[];
  warnings: string[];
}

// Helper function to get user role from Strapi
async function getUserRole(userId: number): Promise<string> {
  try {
    const userRole = await sourceDb.$queryRaw<{role_type: string}[]>`
      SELECT r.type as role_type
      FROM up_users_role_links url
      JOIN up_roles r ON url.role_id = r.id
      WHERE url.user_id = ${userId}
      LIMIT 1
    `;

    if (userRole.length === 0) {
      console.log(`⚠️ No role found for user ID ${userId}, defaulting to 'user'`);
      return 'user';
    }

    const strapiRole = userRole[0].role_type;
    
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
    console.error(`Error getting role for user ${userId}:`, error);
    return 'user'; // Default fallback
  }
}

// Helper function to determine user step
function determineUserStep(user: StrapiUser): string {
  if (user.confirmed) {
    return 'DASHBOARD'; // Users that were confirmed in Strapi go to dashboard
  }
  return 'EMAIL_VERIFICATION';
}

// Helper function to validate bcrypt hash
function isBcryptHash(password: string): boolean {
  return password.startsWith('$2a$') || password.startsWith('$2b$') || password.startsWith('$2y$');
}

// Main migration function
async function migrateUsers(updateExisting: boolean = false): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalUsers: 0,
    localUsers: 0,
    googleUsers: 0,
    migratedSuccessfully: 0,
    usersUpdated: 0,
    errors: [],
    skipped: [],
    warnings: []
  };

  try {
    console.log('🚀 Starting user migration from Strapi to Better-Auth...');
    console.log('📊 Connecting to databases...');

    // Test connections
    await sourceDb.$connect();
    await targetDb.$connect();
    
    console.log('✅ Database connections established');

    // Fetch all users from Strapi
    console.log('📥 Fetching users from Strapi database...');
    
    // Query the Strapi up_users table directly using raw SQL
    const strapiUsers = await sourceDb.$queryRaw<StrapiUser[]>`
      SELECT * FROM up_users ORDER BY created_at ASC
    `;

    stats.totalUsers = strapiUsers.length;
    console.log(`📊 Found ${stats.totalUsers} users to migrate`);

    // Process each user
    for (let i = 0; i < strapiUsers.length; i++) {
      const strapiUser = strapiUsers[i];
      const progress = `[${i + 1}/${stats.totalUsers}]`;
      
      try {
        console.log(`${progress} Processing user: ${strapiUser.email}`);

        // Skip users without email
        if (!strapiUser.email) {
          stats.skipped.push(`User ID ${strapiUser.id}: No email address`);
          console.log(`⚠️ ${progress} Skipped - No email address`);
          continue;
        }

        // Check if user already exists in target database
        const existingUser = await targetDb.user.findUnique({
          where: { email: strapiUser.email }
        });

        if (existingUser) {
          if (!updateExisting) {
            stats.skipped.push(`User ${strapiUser.email}: Already exists`);
            console.log(`⚠️ ${progress} Skipped - Already exists`);
            continue;
          }

          // UPDATE MODE: Update existing user with safe fields only
          console.log(`🔄 ${progress} Checking for changes...`);

          // Get the user's role from Strapi
          const userRole = await getUserRole(strapiUser.id);

          // Handle potential duplicate username
          let username = strapiUser.username;
          if (username && username !== existingUser.username) {
            const existingUsername = await targetDb.user.findUnique({
              where: { username }
            });

            if (existingUsername && existingUsername.id !== existingUser.id) {
              const emailLocal = strapiUser.email.split('@')[0];
              username = `${username}_${emailLocal}`;
              stats.warnings.push(`User ${strapiUser.email}: Username conflict during update, using ${username}`);
            }
          }

          // Prepare update data
          // Use ?? to preserve empty strings - only fall through if null/undefined
          const newName = strapiUser.display_name ??
                          (strapiUser.first_name && strapiUser.last_name ?
                           `${strapiUser.first_name} ${strapiUser.last_name}` : null);

          const updatedData: any = {};
          let hasChanges = false;

          // Check each field for changes
          // Use ?? to preserve empty strings from Strapi (only convert undefined/null)
          const normalizedUsername = username ?? null;
          const normalizedDisplayName = strapiUser.display_name ?? null;
          const normalizedFirstName = strapiUser.first_name ?? null;
          const normalizedLastName = strapiUser.last_name ?? null;
          const normalizedName = newName ?? null;
          const normalizedConfirmed = strapiUser.confirmed ?? false;
          const normalizedBlocked = strapiUser.blocked ?? false;

          const changedFields: string[] = [];

          // Normalize existing values to null for consistent comparison
          // Use ?? to preserve empty strings from database (only convert undefined/null)
          const existingUsername = existingUser.username ?? null;
          const existingDisplayName = existingUser.displayName ?? null;
          const existingFirstName = existingUser.firstName ?? null;
          const existingLastName = existingUser.lastName ?? null;
          const existingName = existingUser.name ?? null;

          if (normalizedUsername !== existingUsername) {
            updatedData.username = normalizedUsername;
            changedFields.push('username');
            hasChanges = true;
          }
          if (normalizedDisplayName !== existingDisplayName) {
            updatedData.displayName = normalizedDisplayName;
            changedFields.push('displayName');
            hasChanges = true;
          }
          if (normalizedFirstName !== existingFirstName) {
            updatedData.firstName = normalizedFirstName;
            changedFields.push('firstName');
            hasChanges = true;
          }
          if (normalizedLastName !== existingLastName) {
            updatedData.lastName = normalizedLastName;
            changedFields.push('lastName');
            hasChanges = true;
          }
          if (normalizedName !== existingName) {
            updatedData.name = normalizedName;
            changedFields.push('name');
            hasChanges = true;
          }
          if (userRole !== existingUser.role) {
            updatedData.role = userRole;
            changedFields.push('role');
            hasChanges = true;
          }
          const normalizedProvider = strapiUser.provider === 'google' ? 'google' : 'email';
          if (normalizedProvider !== (existingUser.provider ?? 'email')) {
            updatedData.provider = normalizedProvider;
            changedFields.push('provider');
            hasChanges = true;
          }
          if (normalizedConfirmed !== (existingUser.confirmed ?? false)) {
            updatedData.confirmed = normalizedConfirmed;
            changedFields.push('confirmed');
            hasChanges = true;
          }
          if (normalizedBlocked !== (existingUser.blocked ?? false)) {
            updatedData.blocked = normalizedBlocked;
            changedFields.push('blocked');
            hasChanges = true;
          }

          if (hasChanges) {
            // Only update if there are actual changes
            // Note: updatedAt is auto-updated by Prisma @updatedAt decorator
            await targetDb.user.update({
              where: { id: existingUser.id },
              data: updatedData
            });

            stats.usersUpdated++;
            console.log(`✅ ${progress} USER UPDATED with changes (${changedFields.join(', ')}): ${strapiUser.email}`);
          } else {
            stats.skipped.push(`User ${strapiUser.email}: No changes detected`);
            console.log(`⚠️ ${progress} Skipped - No changes`);
          }
          continue;
        }

        // Let Prisma generate the CUID automatically
        
        // Determine provider type
        const isLocalUser = strapiUser.provider === 'local';
        const isGoogleUser = strapiUser.provider === 'google';
        
        if (isLocalUser) stats.localUsers++;
        if (isGoogleUser) stats.googleUsers++;

        // Get the user's role from Strapi
        const userRole = await getUserRole(strapiUser.id);

        // Handle potential duplicate username
        let username = strapiUser.username;
        if (username) {
          // Check if username already exists
          const existingUsername = await targetDb.user.findUnique({
            where: { username }
          });

          if (existingUsername) {
            // Make username unique by appending email local part
            const emailLocal = strapiUser.email.split('@')[0];
            username = `${username}_${emailLocal}`;
            stats.warnings.push(`User ${strapiUser.email}: Username conflict, using ${username}`);
          }
        }

        // Prepare user data (let Prisma generate the ID)
        const userData = {
          email: strapiUser.email,
          emailVerified: strapiUser.confirmed || false,
          name: strapiUser.display_name ??
                (strapiUser.first_name && strapiUser.last_name ?
                 `${strapiUser.first_name} ${strapiUser.last_name}` : null),
          createdAt: strapiUser.created_at || new Date(),
          updatedAt: strapiUser.updated_at || new Date(),
          step: determineUserStep(strapiUser),
          confirmed: strapiUser.confirmed || false,
          blocked: strapiUser.blocked || false,
          username: username,
          displayName: strapiUser.display_name,
          firstName: strapiUser.first_name,
          lastName: strapiUser.last_name,
          role: userRole,
          provider: strapiUser.provider === 'google' ? 'google' : 'email'
        };

        // Create user in transaction
        await targetDb.$transaction(async (tx) => {
          // Create user
          const newUser = await tx.user.create({
            data: userData
          });

          // Create account for authentication
          const accountData: {
            userId: string;
            accountId: string;
            providerId: string;
            createdAt: Date;
            updatedAt: Date;
            password?: string;
          } = {
            userId: newUser.id,
            accountId: `${strapiUser.provider}_${strapiUser.id}`, // Unique identifier
            providerId: strapiUser.provider === 'local' ? 'credential' : 'google',
            createdAt: strapiUser.created_at || new Date(),
            updatedAt: strapiUser.updated_at || new Date()
          };

          // Add password for local users
          if (isLocalUser && strapiUser.password) {
            if (isBcryptHash(strapiUser.password)) {
              accountData.password = strapiUser.password; // Keep existing bcrypt hash
            } else {
              // If somehow password is not bcrypt, hash it
              accountData.password = await bcrypt.hash(strapiUser.password, 12);
              console.log(`⚠️ ${progress} Password was not bcrypt, re-hashed`);
            }
          }

          await tx.account.create({
            data: accountData
          });
        });

        stats.migratedSuccessfully++;
        console.log(`✅ ${progress} Successfully migrated ${isLocalUser ? 'local' : 'Google'} user (${userRole})`);

      } catch (error) {
        const errorMsg = `User ${strapiUser.email}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        stats.errors.push(errorMsg);
        console.error(`❌ ${progress} Error:`, error);
      }
    }

    // Print migration summary
    console.log('\n📊 MIGRATION SUMMARY');
    console.log('===================');
    console.log(`Total users processed: ${stats.totalUsers}`);
    console.log(`Local users (with passwords): ${stats.localUsers}`);
    console.log(`Google OAuth users: ${stats.googleUsers}`);
    console.log(`Successfully migrated: ${stats.migratedSuccessfully}`);
    console.log(`Users updated: ${stats.usersUpdated}`);
    console.log(`Skipped: ${stats.skipped.length}`);
    console.log(`Warnings: ${stats.warnings.length}`);
    console.log(`Errors: ${stats.errors.length}`);

    if (stats.skipped.length > 0) {
      console.log('\n⚠️ SKIPPED USERS:');
      stats.skipped.forEach(msg => console.log(`  - ${msg}`));
    }

    if (stats.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      stats.warnings.forEach(msg => console.log(`  - ${msg}`));
    }

    if (stats.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      stats.errors.forEach(msg => console.log(`  - ${msg}`));
    }

    console.log('\n🎉 Migration completed!');
    
    return stats;

  } catch (error) {
    console.error('💥 Fatal migration error:', error);
    throw error;
  } finally {
    await sourceDb.$disconnect();
    await targetDb.$disconnect();
    console.log('🔌 Database connections closed');
  }
}

// Test function to verify a migrated user can log in
async function testUserLogin(email: string, password?: string): Promise<boolean> {
  try {
    console.log(`🧪 Testing login for user: ${email}`);
    
    const user = await targetDb.user.findUnique({
      where: { email },
      include: { accounts: true }
    });

    if (!user) {
      console.log('❌ User not found');
      return false;
    }

    const account = user.accounts.find(acc => acc.providerId === 'credential');
    
    if (account && password) {
      // Test password verification
      const isValid = await bcrypt.compare(password, account.password || '');
      console.log(`🔐 Password validation: ${isValid ? 'PASS' : 'FAIL'}`);
      return isValid;
    } else if (user.accounts.some(acc => acc.providerId === 'google')) {
      console.log('✅ Google OAuth user found');
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Login test error:', error);
    return false;
  }
}

// Rollback function in case of issues
async function rollbackMigration(): Promise<void> {
  console.log('🔄 Starting rollback...');
  
  try {
    await targetDb.$connect();
    
    // Delete all accounts first (due to foreign key constraints)
    await targetDb.account.deleteMany({});
    console.log('✅ Deleted all accounts');
    
    // Delete all profiles
    await targetDb.profile.deleteMany({});
    console.log('✅ Deleted all profiles');
    
    // Delete all users
    await targetDb.user.deleteMany({});
    console.log('✅ Deleted all users');
    
    console.log('🎉 Rollback completed successfully');
  } catch (error) {
    console.error('❌ Rollback error:', error);
    throw error;
  } finally {
    await targetDb.$disconnect();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args[0] === 'rollback') {
    await rollbackMigration();
    return;
  }

  if (args[0] === 'test' && args[1]) {
    await testUserLogin(args[1], args[2]);
    return;
  }

  // Default to update mode (always check for changes and update if needed)
  // Use --create-only flag to skip updates
  const createOnly = args.includes('--create-only');
  const updateExisting = !createOnly; // Update by default

  if (updateExisting) {
    console.log('🔄 UPDATE MODE - Existing records will be updated if changes detected\n');
  } else {
    console.log('📝 CREATE ONLY MODE - Existing records will be skipped\n');
  }

  // Run the migration
  const stats = await migrateUsers(updateExisting);

  // Exit with appropriate code
  process.exit(stats.errors.length > 0 ? 1 : 0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled rejection:', error);
  process.exit(1);
});

if (require.main === module) {
  main().catch(console.error);
}

export { migrateUsers, testUserLogin, rollbackMigration };