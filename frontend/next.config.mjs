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
        ]}
    // rewrites: async () => {
    //     return [
    //       {
    //         // TODO: use ENV variable for backend url
    //         source: "/api/user/:path*",
    //         destination:
    //           process.env.NODE_ENV === "development"
    //             ? "http://127.0.0.1:8000/api/user/:path*"
    //             : "/api/",
    //       },
    //       {
    //         source: "/docs",
    //         destination:
    //           process.env.NODE_ENV === "development"
    //             ? "http://127.0.0.1:8000/docs"
    //             : "/api/docs",
    //       },
    //       {
    //         source: "/openapi.json",
    //         destination:
    //           process.env.NODE_ENV === "development"
    //             ? "http://127.0.0.1:8000/openapi.json"
    //             : "/api/openapi.json",
    //       },
    //     ];
    //   },
};

export default nextConfig;
