import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverSourceMaps: true
  }
};

export default nextConfig;
