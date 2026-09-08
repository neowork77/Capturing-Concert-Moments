import { StatCard } from '@/features/admin/components/ui';

interface BookingKPIProps {
  stats: {
    total: number;
    pending: number;
    confirmed: number;
    cancelled: number;
  };
}

export default function BookingKPI({ stats }: BookingKPIProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-6 sm:mb-8">
      <StatCard label="การจองทั้งหมด" value={stats.total} unit="รายการ" icon="📋" />
      <StatCard label="รอคอนเฟิร์ม" value={stats.pending} unit="คิว" icon="⏳" tone="amber" />
      <StatCard label="คอนเฟิร์มแล้ว" value={stats.confirmed} unit="คิว" icon="✅" tone="emerald" />
      <StatCard label="ยกเลิกแล้ว" value={stats.cancelled} unit="คิว" icon="🚫" tone="rose" />
    </div>
  );
}
