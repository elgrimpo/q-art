/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL
  },
    async redirects() {
      return [
        // permanent: true emits 308 (Next.js); Google treats 308 === 301 for SEO.
        { source: '/', destination: '/generate', permanent: true },
      ];
    },
    async headers() {
      return [
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
        {
          source: '/_next/static/(.*)',
          headers: [
            { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          ],
        },
      ];
    },
    async rewrites() {
        return [
          {
            source: '/explore',
            destination: '/mycodes',
          },
          {
            source: "/api/stripe-webhook",
            destination: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/stripe-webhook`
          },
        ]}
};

export default nextConfig;
