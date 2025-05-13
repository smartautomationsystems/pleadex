// DO NOT MODIFY — critical config, dev server must not restart

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      // NextJS <Image> component needs to whitelist domains for src={}
      "lh3.googleusercontent.com",
      "pbs.twimg.com",
      "images.unsplash.com",
      "logos-world.net",
    ],
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false };
    return config;
  },
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@mui/material', '@emotion/react', '@emotion/styled'],
    serverActions: {
      allowedOrigins: ['localhost:3000', 'pleadex.com'],
    },
  },
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  // Add environment variables that should be available at build time
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    DATABASE_URL: process.env.MONGODB_URI, // Use MONGODB_URI for DATABASE_URL
  },
};

module.exports = nextConfig;
