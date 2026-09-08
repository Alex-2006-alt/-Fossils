import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from local uploads directory
  images: {
    remotePatterns: [],
    unoptimized: true, // MVP: skip Next.js image optimization since we handle it ourselves via sharp
  },
  // Increase body parser limit for photo uploads
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
