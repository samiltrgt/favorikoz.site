/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

// Public sayfalar için açıkça index, follow (Google "dizine eklenmesine izin verildi mi?" için)
const indexFollow = { key: 'X-Robots-Tag', value: 'index, follow' };
const noindexNofollow = { key: 'X-Robots-Tag', value: 'noindex, nofollow' };

module.exports = {
  images: {
    // Speed up local dev and avoid optimizer timeouts
    unoptimized: process.env.NODE_ENV !== 'production',
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.dsmcdn.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      { source: '/(.*)', headers: [...securityHeaders, indexFollow] },
      { source: '/admin/:path*', headers: [...securityHeaders, noindexNofollow] },
      { source: '/api/:path*', headers: [...securityHeaders, noindexNofollow] },
    ];
  },
  // Serverless: bundle iyzipay properly
  experimental: {
    serverComponentsExternalPackages: ['iyzipay'],
  },
};
