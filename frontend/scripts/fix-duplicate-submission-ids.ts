/**
 * Fix duplicate assignedId values in TaxonomySubmission records
 *
 * Problem: When approving multiple submissions without publishing to Git between each,
 * generateUniqueNumericId reads the same Git file and assigns the same ID to all.
 *
 * This script:
 * 1. Finds all duplicate assignedIds
 * 2. Assigns new unique IDs to duplicates
 * 3. Updates Service.tags[] and Profile.skills[] in the database
 * 4. Outputs the corrected tags/skills for tags.ts/skills.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Fix Duplicate Submission IDs ===\n');

  // Step 1: Find all approved submissions grouped by type
  const approved = await prisma.taxonomySubmission.findMany({
    where: { status: 'approved', assignedId: { not: null } },
    orderBy: { reviewedAt: 'asc' },
  });

  console.log(`Total approved submissions: ${approved.length}\n`);

  // Step 2: Find duplicate assignedIds
  const idCounts = new Map<string, typeof approved>();
  for (const sub of approved) {
    const key = `${sub.type}:${sub.assignedId}`;
    if (!idCounts.has(key)) idCounts.set(key, []);
    idCounts.get(key)!.push(sub);
  }

  const duplicates = [...idCounts.entries()].filter(([, subs]) => subs.length > 1);

  if (duplicates.length === 0) {
    console.log('No duplicate IDs found. Nothing to fix.');
    return;
  }

  console.log(`Found ${duplicates.length} duplicate ID groups:\n`);
  for (const [key, subs] of duplicates) {
    console.log(`  ${key}: ${subs.length} submissions`);
    for (const sub of subs) {
      console.log(`    - "${sub.label}" (submission: ${sub.id}, by: ${sub.submittedBy})`);
    }
  }

  // Step 3: Collect ALL existing IDs (from dataset + all submissions) to avoid new collisions
  const allExistingIds = new Set<string>();
  for (const sub of approved) {
    if (sub.assignedId) allExistingIds.add(sub.assignedId);
  }

  // Also get max from tags.ts dataset (approximate from submissions)
  let maxNumericId = 0;
  for (const id of allExistingIds) {
    const num = parseInt(id, 10);
    if (!isNaN(num) && num > maxNumericId) maxNumericId = num;
  }

  console.log(`\nCurrent max numeric ID: ${maxNumericId}`);

  // Step 4: For each duplicate group, keep the first one and reassign the rest
  const updates: Array<{
    submissionId: string;
    oldAssignedId: string;
    newAssignedId: string;
    label: string;
    type: string;
    submittedBy: string;
  }> = [];

  for (const [, subs] of duplicates) {
    // Keep the first submission's ID, reassign the rest
    for (let i = 1; i < subs.length; i++) {
      maxNumericId++;
      const newId = String(maxNumericId);
      allExistingIds.add(newId);

      updates.push({
        submissionId: subs[i].id,
        oldAssignedId: subs[i].assignedId!,
        newAssignedId: newId,
        label: subs[i].label,
        type: subs[i].type,
        submittedBy: subs[i].submittedBy,
      });
    }
  }

  console.log(`\nPlanned reassignments (${updates.length}):\n`);
  for (const u of updates) {
    console.log(`  "${u.label}" (${u.type}): ${u.oldAssignedId} → ${u.newAssignedId}`);
  }

  // Step 5: Dry run check — find affected services/profiles
  console.log('\n--- Checking affected records ---\n');

  for (const u of updates) {
    // Find the profile of the submitter
    const profile = await prisma.profile.findUnique({
      where: { uid: u.submittedBy },
      select: { id: true, displayName: true },
    });

    if (!profile) {
      console.log(`  WARNING: No profile found for user ${u.submittedBy} (tag: "${u.label}")`);
      continue;
    }

    if (u.type === 'tag') {
      // Find services belonging to this profile that contain the old ID
      const services = await prisma.service.findMany({
        where: {
          pid: profile.id,
          tags: { has: u.oldAssignedId },
        },
        select: { id: true, title: true, tags: true },
      });

      console.log(`  "${u.label}" by ${profile.displayName}: ${services.length} service(s) affected`);
      for (const s of services) {
        const count1315 = s.tags.filter((t) => t === u.oldAssignedId).length;
        console.log(`    - Service #${s.id} "${s.title}" (has ${count1315}x "${u.oldAssignedId}" in tags)`);
      }
    } else {
      // Skills in profiles
      const profiles = await prisma.profile.findMany({
        where: {
          uid: u.submittedBy,
          skills: { has: u.oldAssignedId },
        },
        select: { id: true, displayName: true, skills: true },
      });

      console.log(`  "${u.label}" by ${profile.displayName}: ${profiles.length} profile(s) affected`);
    }
  }

  // Step 6: Ask for confirmation
  console.log('\n=== READY TO APPLY FIXES ===');
  console.log('Pass --apply flag to execute the changes.\n');

  if (!process.argv.includes('--apply')) {
    // Output what tags.ts should contain for the new entries
    console.log('--- New entries for tags.ts ---\n');
    for (const u of updates) {
      if (u.type === 'tag') {
        const slug = u.label
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
        console.log(`  { id: '${u.newAssignedId}', label: '${u.label}', slug: '${slug || 'NEEDS-SLUG'}' },`);
      }
    }
    return;
  }

  // Step 7: Apply fixes
  console.log('\nApplying fixes...\n');

  for (const u of updates) {
    // Find the submitter's profile
    const profile = await prisma.profile.findUnique({
      where: { uid: u.submittedBy },
      select: { id: true },
    });

    if (!profile) {
      console.log(`  SKIP: No profile for user ${u.submittedBy}`);
      continue;
    }

    if (u.type === 'tag') {
      // Find this user's services that have the old ID
      const services = await prisma.service.findMany({
        where: {
          pid: profile.id,
          tags: { has: u.oldAssignedId },
        },
        select: { id: true, tags: true },
      });

      for (const service of services) {
        // Replace FIRST occurrence of oldId with newId
        const newTags = [...service.tags];
        const idx = newTags.indexOf(u.oldAssignedId);
        if (idx !== -1) {
          newTags[idx] = u.newAssignedId;
          await prisma.service.update({
            where: { id: service.id },
            data: { tags: newTags },
          });
          console.log(`  Updated Service #${service.id}: replaced tag ${u.oldAssignedId} → ${u.newAssignedId}`);
        }
      }
    } else {
      // Skills in profiles
      const profiles = await prisma.profile.findMany({
        where: {
          uid: u.submittedBy,
          skills: { has: u.oldAssignedId },
        },
        select: { id: true, skills: true },
      });

      for (const prof of profiles) {
        const newSkills = [...prof.skills];
        const idx = newSkills.indexOf(u.oldAssignedId);
        if (idx !== -1) {
          newSkills[idx] = u.newAssignedId;
          await prisma.profile.update({
            where: { id: prof.id },
            data: { skills: newSkills },
          });
          console.log(`  Updated Profile ${prof.id}: replaced skill ${u.oldAssignedId} → ${u.newAssignedId}`);
        }
      }
    }

    // Update the submission record
    await prisma.taxonomySubmission.update({
      where: { id: u.submissionId },
      data: { assignedId: u.newAssignedId },
    });
    console.log(`  Updated Submission ${u.submissionId}: assignedId ${u.oldAssignedId} → ${u.newAssignedId}`);
  }

  console.log('\n=== Done! ===');
  console.log('Now update tags.ts/skills.ts with the new entries and rebuild taxonomy maps.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
