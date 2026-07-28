/**
 * Next.js Bundle Analyzer Configuration
 * Use: ANALYZE=true yarn build
 */

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: true,
});

const nextConfig = require('./next.config');

module.exports = withBundleAnalyzer(nextConfig);
