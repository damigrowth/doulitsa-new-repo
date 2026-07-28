import { performance } from 'perf_hooks';

/**
 * Simple performance benchmark to validate optimizations
 * Run with: yarn benchmark
 */

async function runBenchmarks() {
  console.log('🏁 Performance Benchmarks\n');
  console.log('='.repeat(60));

  // Import after dynamic setup
  const { findServiceById, batchFindServiceByIds } = await import(
    '../src/lib/taxonomies'
  );
  const { findById } = await import('../src/lib/utils/datasets');
  const { serviceTaxonomies } = await import(
    '../src/constants/datasets/service-taxonomies'
  );

  // Test data - real IDs from your taxonomy
  const testIds = [
    'web-dev',
    'graphic-design',
    'digital-marketing',
    'video-production',
    'writing-translation',
    'photography',
    'social-media',
    'seo',
    'content-creation',
    'animation',
  ];

  console.log('\n📊 TAXONOMY LOOKUP BENCHMARKS\n');

  // Benchmark OLD method (O(n))
  console.log('Testing OLD findById (O(n) linear search)...');
  const oldStart = performance.now();
  for (let i = 0; i < 10000; i++) {
    testIds.forEach((id) => findById(serviceTaxonomies, id));
  }
  const oldEnd = performance.now();
  const oldTime = oldEnd - oldStart;

  console.log(
    `✗ OLD: ${oldTime.toFixed(2)}ms for 10,000 iterations × ${testIds.length} lookups`
  );
  console.log(
    `  Average: ${(oldTime / 10000).toFixed(3)}ms per request\n`
  );

  // Benchmark NEW method (O(1))
  console.log('Testing NEW findServiceById (O(1) hash map)...');
  const newStart = performance.now();
  for (let i = 0; i < 10000; i++) {
    testIds.forEach((id) => findServiceById(id));
  }
  const newEnd = performance.now();
  const newTime = newEnd - newStart;

  console.log(
    `✓ NEW: ${newTime.toFixed(2)}ms for 10,000 iterations × ${testIds.length} lookups`
  );
  console.log(
    `  Average: ${(newTime / 10000).toFixed(3)}ms per request\n`
  );

  // Benchmark BATCH method
  console.log('Testing BATCH batchFindServiceByIds (O(1) optimized)...');
  const batchStart = performance.now();
  for (let i = 0; i < 10000; i++) {
    batchFindServiceByIds(testIds);
  }
  const batchEnd = performance.now();
  const batchTime = batchEnd - batchStart;

  console.log(
    `✓ BATCH: ${batchTime.toFixed(2)}ms for 10,000 iterations × ${testIds.length} lookups`
  );
  console.log(
    `  Average: ${(batchTime / 10000).toFixed(3)}ms per request\n`
  );

  // Calculate improvements
  console.log('='.repeat(60));
  console.log('🎯 RESULTS:\n');
  console.log(
    `Speedup (NEW vs OLD): ${(oldTime / newTime).toFixed(1)}x faster`
  );
  console.log(
    `Speedup (BATCH vs OLD): ${(oldTime / batchTime).toFixed(1)}x faster`
  );
  console.log(
    `Speedup (BATCH vs NEW): ${(newTime / batchTime).toFixed(1)}x faster\n`
  );

  console.log('💰 ESTIMATED COST SAVINGS (at 10K requests/day):\n');
  const requestsPerDay = 10000;
  const avgLookupsPerRequest = 20; // Conservative estimate
  const oldTimePerRequest = (oldTime / 10000) * avgLookupsPerRequest;
  const newTimePerRequest = (newTime / 10000) * avgLookupsPerRequest;
  const timeSaved = oldTimePerRequest - newTimePerRequest;

  console.log(`Old: ${oldTimePerRequest.toFixed(2)}ms per request`);
  console.log(`New: ${newTimePerRequest.toFixed(2)}ms per request`);
  console.log(
    `Saved: ${timeSaved.toFixed(2)}ms per request (${((timeSaved / oldTimePerRequest) * 100).toFixed(1)}% faster)\n`
  );

  // Cost calculation (rough estimate)
  const costPerMsVercel = 0.00001; // Approximate Vercel pricing
  const dailySavings = requestsPerDay * timeSaved * costPerMsVercel;
  const monthlySavings = dailySavings * 30;

  console.log(`Daily cost savings: $${dailySavings.toFixed(2)}`);
  console.log(`Monthly cost savings: $${monthlySavings.toFixed(2)}\n`);

  console.log('='.repeat(60));
  console.log('✅ Benchmark complete!\n');
}

runBenchmarks().catch(console.error);
