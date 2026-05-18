import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  display: 'swap',
});

import SmoothScrolling from '@/components/SmoothScrolling';

export const metadata: Metadata = {
  title: 'watashiwajp — รับถ่ายรูปหน้าคอนเสิร์ต',
  description:
    'รับถ่ายรูปหน้าคอนเสิร์ต พอร์ตเทรต และงานอีเวนต์ต่างๆ บันทึกความทรงจำและทุกช่วงเวลา (Concert & Portrait Photography)',
  keywords: [
    'รับถ่ายรูป',
    'ถ่ายรูปหน้าคอนเสิร์ต',
    'ช่างภาพพอร์ตเทรต',
  ],
  openGraph: {
    title: 'watashiwajp — รับถ่ายรูปหน้าคอนเสิร์ต',
    description: 'รับถ่ายรูปหน้าคอนเสิร์ต พอร์ตเทรต และงานอีเวนต์ต่างๆ บันทึกความทรงจำและทุกช่วงเวลาสำคัญ',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} antialiased`}>
      <body className="min-h-screen bg-[#FFFBFC] text-[#3D3040] font-sans">
        <SmoothScrolling>
          {children}
        </SmoothScrolling>
      </body>
    </html>
  );
}
