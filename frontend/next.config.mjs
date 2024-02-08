/** @type {import('next').NextConfig} */
const nextConfig = {
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
