// DO NOT MODIFY — critical config, dev server must not restart
require('dotenv').config();

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
      "pleadex.com",
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
    serverComponentsExternalPackages: ['mongodb'],
  },
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  // Add public environment variables that are safe to expose
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://pleadex.com',
  },
  // Skip server-side validation during build
  output: 'standalone',
  // Configure dynamic routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: 'https://pleadex.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
  // Configure metadata base URL
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://pleadex.com'),
  // Add dynamic route configuration
  async rewrites() {
    return [
      {
        source: '/api/documents/search',
        destination: '/api/documents/search',
      },
    ];
  },
};

module.exports = nextConfig;
