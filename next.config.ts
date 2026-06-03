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
    ],
  },
  
  // 🟢 สำหรับ Next.js เวอร์ชันใหม่ ต้องย้ายมาใส่ใน experimental แบบนี้ครับ
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb', // ปรับขนาดไฟล์ตามต้องการ เช่น '20mb', '50mb'
    },
  },
};

export default nextConfig;