import type { NextConfig } from 'next';
import path from 'path';

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
  // ล็อคเป้าหมายให้ Turbopack สแกนเฉพาะในโฟลเดอร์นี้เพื่อไม่ให้ค้าง (ใช้ absolute path เพื่อป้องกัน warning)
  turbopack: {
    root: path.resolve(process.cwd()), 
  },
  async redirects() {
    return [
      {
        source: '/upload',
        destination: '/admin/upload',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;