import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Quotation is not part of presales UX; send users to dashboard if they open old links
      { source: "/quotation", destination: "/caller/dashboard", permanent: false },
      { source: "/quotation/:path*", destination: "/caller/dashboard", permanent: false },
    ];
  },
  // Browser calls same-origin `/api/*` (see apiClient getCoreApiBaseUrl); Next forwards to core-api.
  async rewrites() {
    const target =
      process.env.CORE_API_INTERNAL_URL?.replace(/\/$/, "") ||
      "http://127.0.0.1:3000";
    return [
      {
        source: "/api/:path*",
        destination: `${target}/api/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
