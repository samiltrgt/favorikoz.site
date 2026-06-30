/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // HSTS stays strong (1y + subdomains) but intentionally OMITS `preload`: the apex
  // currently shows rare/intermittent TLS handshake failures on Vercel's anycast edge,
  // and the browser preload list is hard to exit. Re-add `preload` only after the apex
  // is verified stable (see scripts/diagnose-ssl.mjs) and you submit at hstspreload.org.
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
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
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.myikas.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cosskozmetik.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.runailshop.com',
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
      { source: '/api/categories', headers: [
        ...securityHeaders,
        noindexNofollow,
        { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
      ]},
      { source: '/api/:path*', headers: [...securityHeaders, noindexNofollow] },
    ];
  },
  // Serverless: bundle iyzipay properly
  experimental: {
    serverComponentsExternalPackages: ['iyzipay'],
  },
};
