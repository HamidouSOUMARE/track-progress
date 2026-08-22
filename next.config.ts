import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pas de fichiers de règles générés dans le dépôt.
  agentRules: false,
};

export default nextConfig;
