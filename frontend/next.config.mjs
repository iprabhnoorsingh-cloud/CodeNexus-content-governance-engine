/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    if (process.env.NODE_ENV === "development") {
      const backendUrl = (
        process.env.BACKEND_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        "http://localhost:8000"
      ).replace(/\/$/, "");
      return [
        {
          source: "/api/:path*",
          destination: `${backendUrl}/api/:path*`,
        },
        {
          source: "/health",
          destination: `${backendUrl}/health`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
