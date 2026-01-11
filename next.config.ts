import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Suppress hydration mismatch warnings caused by browser extensions
  serverExternalPackages: [],

  // Enable React Strict Mode for better development experience
  reactStrictMode: true,

  // ⚡ PERFORMANCE OPTIMIZATIONS

  // Enable gzip compression for production
  compress: true,

  // Disable source maps in production to reduce build size
  // Comment this out if you need production debugging
  productionBrowserSourceMaps: false,

  // Optimize images automatically
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Note: swcMinify is default in Next.js 16+ (no need to specify)
  // Note: modularizeImports removed - causing build errors with recharts
  // Note: webpack config removed - Turbopack uses different config

  // Bundle analysis with Turbopack (uncomment to analyze bundle size)
  // experimental: {
  //   turbo: {
  //     rules: {
  //       '*.svg': {
  //         loaders: ['@svgr/webpack'],
  //         as: '*.js',
  //       },
  //     },
  //   },
  // },
};

export default nextConfig;
