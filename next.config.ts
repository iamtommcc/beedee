import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverSourceMaps: true
  },
  serverExternalPackages: [
    'import-in-the-middle',
    'require-in-the-middle',
  ],
};

export default nextConfig;
