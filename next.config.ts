import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Desactiva la verificación exhaustiva de tipos en el build de producción
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;