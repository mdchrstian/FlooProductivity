import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  experimental: { cpus: 1 },
  webpack(config) {
    config.cache = false;
    return config;
  },
};
export default config;
