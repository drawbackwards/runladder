import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "drawbackwards.com",
        pathname: "/images/**",
      },
    ],
  },
  async redirects() {
    return [
      // /organizations content lives at /framework now. 301 preserves SEO.
      { source: "/organizations", destination: "/framework", permanent: true },
    ];
  },
};

export default nextConfig;
