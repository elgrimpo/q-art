/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'qrartimages.s3.us-west-1.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'qrartimageswatermarked.s3.us-west-1.amazonaws.com',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL
  },
    async redirects() {
      return [
        // permanent: true emits 308 (Next.js); Google treats 308 === 301 for SEO.
        { source: '/', destination: '/generate', permanent: true },
        // /gallery retired in favor of /explore; preserve its link equity.
        { source: '/gallery', destination: '/explore', permanent: true },
      ];
    },
    async headers() {
      const headerRules = [
        {
          source: '/(.*)',
          headers: [
            { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
            // HSTS without preload/includeSubDomains until apex HTTPS is confirmed (QRAI-6)
            { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
          ],
        },
      ];

      // Only mark static chunks immutable in production, where filenames are
      // content-hashed. In dev, chunk URLs are stable (e.g. page.js), so a
      // year-long immutable cache makes the browser serve stale JS after every
      // recompile — code edits silently never take effect.
      if (process.env.NODE_ENV === 'production') {
        headerRules.push({
          source: '/_next/static/(.*)',
          headers: [
            { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          ],
        });
      }

      return headerRules;
    },
    async rewrites() {
        return [
          {
            source: "/api/stripe-webhook",
            destination: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/stripe-webhook`
          },
        ]}
};

export default nextConfig;
