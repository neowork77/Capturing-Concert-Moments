interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'w-3.5 h-3.5 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-2',
} as const;

/** วงกลมหมุนอย่างเดียว — ใช้ประกอบใน LoadingBlock หรือในปุ่ม */
export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="กำลังโหลด"
      className={`inline-block rounded-full border-[#F4A0B5]/25 border-t-[#F4A0B5] animate-spin ${SIZES[size]} ${className}`}
    />
  );
}

/** บล็อกสถานะกำลังโหลดพร้อมข้อความ ใช้แทนที่ว่างของเนื้อหา */
export function LoadingBlock({ message = 'กำลังโหลดข้อมูล...' }: { message?: string }) {
  return (
    <div className="py-14 flex flex-col items-center justify-center gap-3">
      <Spinner size="lg" />
      <p className="text-sm text-[var(--ink-muted)]">{message}</p>
    </div>
  );
}

export default Spinner;
