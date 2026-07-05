import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    qualities: [50, 75, 85],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  // ล็อคเป้าหมายให้ Turbopack สแกนเฉพาะในโฟลเดอร์นี้เพื่อไม่ให้ค้าง
  turbopack: {
    root: './', 
  },
};

export default nextConfig;