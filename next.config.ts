import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Pin the workspace root: another lockfile exists higher up in the user folder.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
