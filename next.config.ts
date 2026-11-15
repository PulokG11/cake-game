import type { NextConfig } from 'next';

// GitHub Pages serves the repo under /<repo-name>; the deploy workflow sets
// NEXT_PUBLIC_BASE_PATH=/cake-game. Locally it is unset and the app lives at /.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
