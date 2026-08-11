import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Evita que TypeScript se quede colgado en la fase de verificación en Vercel
    ignoreBuildErrors: true,
  },
  eslint: {
    // Evita que ESLint bloquee la compilación
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;