import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: __dirname,
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: "/landing.html",
        destination: "/",
      },
      {
        source: "/landing",
        destination: "/",
      },
      {
        source: "/home",
        destination: "/",
      },
      {
        source: "/index.html",
        destination: "/",
      },
    ];
  },
};

export default nextConfig;
