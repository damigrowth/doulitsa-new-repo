/**
 * MIGRATION TEST SCRIPT
 * 
 * Tests the migrated users to ensure they can authenticate properly
 * and all data was migrated correctly.
 */

import { PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth/config';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface TestResult {
  email: string;
  testType: 'local' | 'google';
  userExists: boolean;
  accountExists: boolean;
  passwordValid?: boolean;
  dataComplete: boolean;
  issues: string[];
}

interface TestSummary {
  totalTested: number;
  passed: number;
  failed: number;
  results: TestResult[];
  errors: string[];
}

/**
 * Test a sample of migrated users
 */
async function testMigratedUsers(sampleSize: number = 10): Promise<TestSummary> {
  const summary: TestSummary = {
    totalTested: 0,
    passed: 0,
    failed: 0,
    results: [],
    errors: []
  };

  try {
    console.log('🧪 Starting migration test...');
    console.log(`📊 Testing ${sampleSize} random users`);

    // Get a sample of users
    const users = await prisma.user.findMany({
      take: sampleSize,
      include: {
        accounts: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`Found ${users.length} users to test`);

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const progress = `[${i + 1}/${users.length}]`;
      
      try {
        console.log(`${progress} Testing user: ${user.email}`);
        
        const result: TestResult = {
          email: user.email,
          testType: 'local', // Will be determined below
          userExists: true,
          accountExists: false,
          dataComplete: true,
          issues: []
        };

        // Check accounts
        if (user.accounts.length === 0) {
          result.accountExists = false;
          result.issues.push('No account found');
        } else {
          result.accountExists = true;
          
          // Determine test type
          const credentialAccount = user.accounts.find(acc => acc.providerId === 'credential');
          const googleAccount = user.accounts.find(acc => acc.providerId === 'google');
          
          if (credentialAccount) {
            result.testType = 'local';
            
            // Test password validation if it's a local account
            if (credentialAccount.password) {
              // We can't test actual password since we don't have the plaintext
              // But we can verify the hash format
              const isBcryptHash = credentialAccount.password.startsWith('$2a$') || 
                                 credentialAccount.password.startsWith('$2b$') || 
                                 credentialAccount.password.startsWith('$2y$');
              
              if (isBcryptHash) {
                result.passwordValid = true;
              } else {
                result.passwordValid = false;
                result.issues.push('Password is not in bcrypt format');
              }
            } else {
              result.issues.push('Local account missing password');
            }
          } else if (googleAccount) {
            result.testType = 'google';
            result.passwordValid = true; // Google accounts don't need passwords
          }
        }

        // Check required fields
        if (!user.email) {
          result.issues.push('Missing email');
          result.dataComplete = false;
        }
        
        if (!user.id || user.id.length < 20) {
          result.issues.push('Invalid user ID (should be CUID)');
          result.dataComplete = false;
        }

        // Check step progression
        if (user.confirmed && user.step === 'EMAIL_VERIFICATION') {
          result.issues.push('User confirmed but still on EMAIL_VERIFICATION step');
        }

        // Determine if test passed
        const testPassed = result.accountExists && 
                          result.dataComplete && 
                          result.issues.length === 0 &&
                          (result.passwordValid === undefined || result.passwordValid === true);

        if (testPassed) {
          summary.passed++;
          console.log(`✅ ${progress} PASSED (${result.testType} user)`);
        } else {
          summary.failed++;
          console.log(`❌ ${progress} FAILED - Issues: ${result.issues.join(', ')}`);
        }

        summary.results.push(result);
        summary.totalTested++;

      } catch (error) {
        const errorMsg = `User ${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        summary.errors.push(errorMsg);
        summary.failed++;
        console.error(`❌ ${progress} ERROR:`, error);
      }
    }

    // Print test summary
    console.log('\n📊 MIGRATION TEST SUMMARY');
    console.log('========================');
    console.log(`Total users tested: ${summary.totalTested}`);
    console.log(`Tests passed: ${summary.passed}`);
    console.log(`Tests failed: ${summary.failed}`);
    console.log(`Success rate: ${((summary.passed / summary.totalTested) * 100).toFixed(1)}%`);

    // Detailed breakdown
    const localUsers = summary.results.filter(r => r.testType === 'local').length;
    const googleUsers = summary.results.filter(r => r.testType === 'google').length;
    
    console.log('\n📈 BREAKDOWN:');
    console.log(`Local users: ${localUsers}`);
    console.log(`Google users: ${googleUsers}`);

    // Common issues
    const allIssues = summary.results.flatMap(r => r.issues);
    const issuesCounts = allIssues.reduce((acc, issue) => {
      acc[issue] = (acc[issue] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (Object.keys(issuesCounts).length > 0) {
      console.log('\n⚠️ COMMON ISSUES:');
      Object.entries(issuesCounts).forEach(([issue, count]) => {
        console.log(`  - ${issue}: ${count} users`);
      });
    }

    if (summary.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      summary.errors.forEach(error => console.log(`  - ${error}`));
    }

    return summary;

  } catch (error) {
    console.error('💥 Test execution error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Test specific user authentication
 */
async function testUserAuth(email: string, password?: string): Promise<void> {
  try {
    console.log(`🔐 Testing authentication for: ${email}`);
    
    const user = await prisma.user.findUnique({
      where: { email },
      include: { accounts: true }
    });

    if (!user) {
      console.log('❌ User not found in database');
      return;
    }

    console.log('✅ User found in database');
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Created: ${user.createdAt}`);
    console.log(`   - Step: ${user.step}`);
    console.log(`   - Confirmed: ${user.confirmed}`);
    console.log(`   - Email Verified: ${user.emailVerified}`);
    console.log(`   - Role: ${user.role}`);
    console.log(`   - Accounts: ${user.accounts.length}`);

    // Test account types
    user.accounts.forEach((account, index) => {
      console.log(`   - Account ${index + 1}: ${account.providerId}`);
      if (account.providerId === 'credential' && account.password) {
        console.log(`     Password hash: ${account.password.substring(0, 20)}...`);
      }
    });

    // Test password if provided
    if (password && user.accounts.length > 0) {
      const credentialAccount = user.accounts.find(acc => acc.providerId === 'credential');
      if (credentialAccount?.password) {
        const isValid = await bcrypt.compare(password, credentialAccount.password);
        console.log(`🔑 Password test: ${isValid ? 'VALID ✅' : 'INVALID ❌'}`);
      } else {
        console.log('⚠️ No credential account found for password test');
      }
    }

  } catch (error) {
    console.error('❌ Authentication test error:', error);
  }
}

/**
 * Generate migration report
 */
async function generateMigrationReport(): Promise<void> {
  try {
    console.log('📋 Generating migration report...');
    
    const stats = {
      totalUsers: await prisma.user.count(),
      totalAccounts: await prisma.account.count(),
      credentialAccounts: await prisma.account.count({ where: { providerId: 'credential' } }),
      googleAccounts: await prisma.account.count({ where: { providerId: 'google' } }),
      confirmedUsers: await prisma.user.count({ where: { confirmed: true } }),
      emailVerifiedUsers: await prisma.user.count({ where: { emailVerified: true } }),
      usersInDashboard: await prisma.user.count({ where: { step: 'DASHBOARD' } }),
      usersInOnboarding: await prisma.user.count({ where: { step: 'ONBOARDING' } }),
      usersInVerification: await prisma.user.count({ where: { step: 'EMAIL_VERIFICATION' } })
    };

    console.log('\n📊 MIGRATION REPORT');
    console.log('==================');
    console.log(`Total Users: ${stats.totalUsers}`);
    console.log(`Total Accounts: ${stats.totalAccounts}`);
    console.log('\n🔐 AUTHENTICATION METHODS:');
    console.log(`Email/Password users: ${stats.credentialAccounts}`);
    console.log(`Google OAuth users: ${stats.googleAccounts}`);
    console.log('\n👤 USER STATUS:');
    console.log(`Confirmed users: ${stats.confirmedUsers}`);
    console.log(`Email verified: ${stats.emailVerifiedUsers}`);
    console.log('\n📍 USER JOURNEY:');
    console.log(`In Dashboard: ${stats.usersInDashboard}`);
    console.log(`In Onboarding: ${stats.usersInOnboarding}`);
    console.log(`In Email Verification: ${stats.usersInVerification}`);

    // Check for inconsistencies
    console.log('\n🔍 HEALTH CHECKS:');
    
    if (stats.totalUsers !== stats.totalAccounts) {
      console.log(`⚠️ User/Account mismatch: ${stats.totalUsers} users vs ${stats.totalAccounts} accounts`);
    } else {
      console.log('✅ User/Account ratio is correct (1:1)');
    }

    if (stats.credentialAccounts + stats.googleAccounts !== stats.totalAccounts) {
      console.log('⚠️ Account provider mismatch detected');
    } else {
      console.log('✅ All accounts have valid providers');
    }

  } catch (error) {
    console.error('❌ Report generation error:', error);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args[0] === 'auth' && args[1]) {
    await testUserAuth(args[1], args[2]);
    return;
  }
  
  if (args[0] === 'report') {
    await generateMigrationReport();
    return;
  }
  
  if (args[0] === 'sample') {
    const sampleSize = parseInt(args[1]) || 10;
    await testMigratedUsers(sampleSize);
    return;
  }
  
  // Default: run all tests
  await generateMigrationReport();
  console.log('\n');
  await testMigratedUsers(10);
}

if (require.main === module) {
  main().catch(console.error);
}

export { testMigratedUsers, testUserAuth, generateMigrationReport };