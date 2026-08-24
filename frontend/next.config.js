/** @type {import('next').NextConfig} */
const nextConfig = {
  // TEMPORARY: Disable strict mode to test if React double-mounting is causing realtime subscription issues
  // TODO: Re-enable after implementing useRef pattern for channel persistence
  reactStrictMode: false,

  // Allow dev server access from local network devices
  allowedDevOrigins: ['192.168.1.231', '*.local'],

  // Performance optimizations
  poweredByHeader: false, // Remove X-Powered-By header for security
  generateEtags: true, // Enable ETags for better caching

  experimental: {
    globalNotFound: true,
    browserDebugInfoInTerminal: true,
    clientSegmentCache: true,
    devtoolSegmentExplorer: true,
    serverActions: {
      bodySizeLimit: '20mb',
    },
    reactCompiler: true,
    inlineCss: true,
    optimizeCss: true,
    webVitalsAttribution: ['CLS', 'LCP', 'FID', 'TTFB', 'INP'],
    optimizePackageImports: [
      'zustand',
      'date-fns',
      'lucide-react',
      // Granular Radix UI splitting for better tree-shaking
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-popover',
      '@radix-ui/react-tabs',
      '@radix-ui/react-slot',
      '@radix-ui/react-avatar',
      '@radix-ui/react-label',
      '@radix-ui/react-separator',
      'react-hook-form',
      'react-day-picker',
      'cmdk',
      '@hookform/resolvers',
      // Embla carousel removed from homepage hero (using CSS scroll-snap instead)
      // Still available for below-fold carousels (services, profiles, testimonials)
      'embla-carousel-react',
    ],
  },

  // Compiler options for better optimization
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error', 'warn'],
          }
        : false,
  },
  images: {
    unoptimized: true, // Use Cloudinary optimization instead of Next.js
    // Optimized for mobile-first responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 160, 200, 256, 285, 331],
    formats: ['image/webp'],
    minimumCacheTTL: 2678400, // 31 days
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

  // HTTP headers for performance and security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: '/s',
        destination: '/ipiresies',
        permanent: true,
      },
      {
        source: '/profile',
        destination: '/pros',
        permanent: true,
      },
      {
        source: '/auth/sign-in',
        destination: '/login',
        permanent: true,
      },
      {
        source: '/pros',
        destination: '/dir',
        permanent: true,
      },
      {
        source: '/pros/:category',
        destination: '/dir/:category',
        permanent: true,
      },
      {
        source: '/pros/:category/:subcategory',
        destination: '/dir/:category/:subcategory',
        permanent: true,
      },
      {
        source: '/companies',
        destination: '/dir',
        permanent: true,
      },
      {
        source: '/companies/:category',
        destination: '/dir/:category',
        permanent: true,
      },
      {
        source: '/companies/:category/:subcategory',
        destination: '/dir/:category/:subcategory',
        permanent: true,
      },
    ];
  },

  // Enable compression
  compress: true,

  // Production-only optimizations
  ...(process.env.NODE_ENV === 'production' && {
    productionBrowserSourceMaps: false, // Disable source maps in production
  }),
};

module.exports = nextConfig;
