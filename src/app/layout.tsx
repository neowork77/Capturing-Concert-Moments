import type { Metadata } from 'next';
import { Inter, Outfit, Noto_Sans_Thai } from 'next/font/google';
import './globals.css';
import SmoothScrolling from '@/shared/components/SmoothScrolling';

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

// Inter และ Outfit ไม่มีชุดอักขระไทย — ถ้าไม่โหลดฟอนต์ไทยไว้ ตัวอักษรไทยจะตกไปใช้
// ฟอนต์สำรองของ OS (Thonburi / Leelawadee / Noto) ซึ่ง metrics ไม่ตรงกันในแต่ละเครื่อง
const notoThai = Noto_Sans_Thai({
  variable: '--font-thai',
  subsets: ['thai', 'latin'],
  display: 'swap',
});

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
    <html lang="th" className={`${inter.variable} ${outfit.variable} ${notoThai.variable} antialiased`} data-scroll-behavior="smooth">
      <body className="min-h-screen bg-[#FFFBFC] text-[#3D3040] font-sans">
        <SmoothScrolling>
          {children}
        </SmoothScrolling>
      </body>
    </html>
  );
}
