import img1 from '@/assets/Ricohgr3x.webp';
import img2 from '@/assets/fujiinstax11.webp';

export interface PackageItem {
  title: string;
  description: string;
  price: string;
  priceNote: string;
  features: string[];
  image: { src: string; width: number; height: number; blurDataURL?: string };
  imageClassName?: string;
  accent: string;
  accentBg: string;
}

export const packages: PackageItem[] = [
  {
    title: 'กล้อง RICOH GR IIIx + Flash',
    description:
      'เหมาะสำหรับการถ่ายภาพหน้าคอนเสิร์ตหรืออีเวนต์ขนาดเล็ก เน้นเก็บโมเมนต์สดๆ แบบเป็นธรรมชาติ ด้วยกล้อง Ricoh GRIIIx ที่ให้โทนภาพสวย คม ชัด และมีเอกลักษณ์เฉพาะตัว เหมาะสำหรับคนที่ต้องการภาพที่ดูดีแบบไม่ต้องแต่งเพิ่ม',
    price: '฿219',
    priceNote: '20 นาที',
    features: ['ไม่จำกัดจำนวนรูป', 'สวยจบหลังกล้อง', 'พร้อมรับรูปภายในวันหลังคอนเสิร์ตจบ', 'เหมาะสำหรับเก็บโมเมนต์หน้าคอนเสิร์ต'],
    image: img1,
    imageClassName: 'object-contain scale-[0.95]',
    accent: '#F4A0B5',
    accentBg: '#FFF5F7',
  },
  {
    title: 'Fujifilm instax mini 11 Instant Film กล้องโพลารอยด์',
    description:
      'ถ่ายด้วยกล้องโพลารอยด์ Fujifilm instax mini 11 ได้รูปจริงทันทีหลังถ่าย ให้ฟีลภาพฟิล์มคลาสสิก สีสวย มีเอกลักษณ์เฉพาะตัว',
    price: '฿65',
    priceNote: '1 รูป',
    features: ['ถ่ายภาพด้วยกล้องโพลารอยด์ ได้รูปจริงทันทีหลังถ่าย รอเพียงไม่กี่นาที', 'โทนภาพฟิล์ม ให้ฟีลคลาสสิก สีสวย มีเอกลักษณ์เฉพาะตัว', 'เหมาะสำหรับถ่ายเดี่ยว คู่ หรือกลุ่มเล็ก', 'สามารถรับรูปกลับได้ทันทีหลังถ่าย เป็นของที่ระลึกจากงานนั้นๆ'],
    image: img2,
    accent: '#D8CCE8',
    accentBg: '#F8F5FC',
  }
];

export const getSlideDistance = () =>
  typeof window !== 'undefined' && window.innerWidth < 640 ? 250 : 600;

export const getImageDistance = () =>
  typeof window !== 'undefined' && window.innerWidth < 640 ? 150 : 400;

export const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? getSlideDistance() : -getSlideDistance(),
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -getSlideDistance() : getSlideDistance(),
    opacity: 0,
    scale: 0.95,
  }),
};

export const imageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? getImageDistance() : -getImageDistance(),
    opacity: 0,
    scale: 1.1,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -getImageDistance() : getImageDistance(),
    opacity: 0,
    scale: 0.95,
  }),
};
