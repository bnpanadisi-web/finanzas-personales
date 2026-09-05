import type { NextConfig } from "next";

const isMobileExport =
  process.env.BUILD_MOBILE === 'true' || process.env.CAPACITOR_BUILD === 'true';

const nextConfig: NextConfig = {
  ...(isMobileExport ? { output: 'export' } : {}),
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: [
    "192.168.0.39",
    "192.168.0.39:3000",
    "localhost",
    "localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3000",
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;