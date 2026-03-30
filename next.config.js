/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Helps repeat visits avoid HTTP->HTTPS redirect; preload requires domain-side submission.
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
];

// Public sayfalar için açıkça index, follow (Google "dizine eklenmesine izin verildi mi?" için)
const indexFollow = { key: 'X-Robots-Tag', value: 'index, follow' };
const noindexNofollow = { key: 'X-Robots-Tag', value: 'noindex, nofollow' };

module.exports = {
  trailingSlash: false,
  compress: true,
  images: {
    loader: 'custom',
    loaderFile: './src/lib/cloudinary-loader.ts',
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [320, 420, 640, 750, 828, 1080],
    imageSizes: [64, 96, 128, 160, 192, 256, 320],
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
    optimizeCss: true,
  },
};
