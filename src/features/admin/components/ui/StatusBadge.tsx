import { StatusStyle } from '@/shared/utils/status-display';

interface StatusBadgeProps {
  status: StatusStyle;
  /** soft = badge บนพื้นอ่อน (ค่าเริ่มต้น) · solid = เน้นเมื่อถูกเลือก */
  variant?: 'soft' | 'solid';
  /** ใช้คำสั้นสำหรับตารางหรือพื้นที่แคบ */
  short?: boolean;
  className?: string;
}

/**
 * ป้ายสถานะมาตรฐาน — ใช้จุดสี + ข้อความเสมอ ไม่พึ่ง emoji เพียงอย่างเดียว
 * เพราะ emoji ที่ขนาดเล็กอ่านไม่ออกและเรนเดอร์ต่างกันในแต่ละระบบปฏิบัติการ
 */
export default function StatusBadge({
  status,
  variant = 'soft',
  short = false,
  className = '',
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-micro font-bold whitespace-nowrap ${
        variant === 'solid' ? status.solid : status.soft
      } ${className}`}
    >
      <span
        aria-hidden
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          variant === 'solid' ? 'bg-white/80' : status.dot
        }`}
      />
      {short ? status.short : status.label}
    </span>
  );
}
