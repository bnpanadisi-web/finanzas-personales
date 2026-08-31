import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
  typedRoutes: false,
};

export default nextConfig;