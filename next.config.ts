import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // produces .next/standalone — needed for Docker minimal images
};

export default nextConfig;
