/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
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
