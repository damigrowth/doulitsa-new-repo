#!/usr/bin/env tsx

/**
 * SIMPLE RUNNER FOR IMAGE DEBUG SCRIPT
 * 
 * This script provides an easier way to run the image debug analysis
 */

import { execSync } from 'child_process';
import path from 'path';

const scriptPath = path.join(__dirname, 'debug-profile-images.ts');

async function runDebug() {
  const args = process.argv.slice(2);
  
  console.log('🚀 Running Profile Image Debug Script...\n');
  
  try {
    // Construct the command
    const command = `yarn tsx "${scriptPath}" ${args.join(' ')}`;
    
    // Execute the script
    execSync(command, { 
      stdio: 'inherit',
      cwd: path.dirname(__dirname)
    });
    
  } catch (error) {
    console.error('❌ Error running debug script:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runDebug();
}