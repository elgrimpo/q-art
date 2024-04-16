/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL
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
