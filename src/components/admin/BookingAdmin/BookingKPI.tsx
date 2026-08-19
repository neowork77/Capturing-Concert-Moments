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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      <div className="bg-white/80 backdrop-blur-xl p-4 rounded-2xl border border-[rgba(0,0,0,0.05)] shadow-xs">
        <span className="text-[10px] font-bold text-[#9E8E95] uppercase tracking-wider block">การจองทั้งหมด</span>
        <span className="font-display text-2xl font-bold text-[#3D3040]">{stats.total} <span className="text-xs font-normal text-[#9E8E95]">รายการ</span></span>
      </div>
      <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/60 shadow-xs">
        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">⏳ รอคอนเฟิร์ม (Pending)</span>
        <span className="font-display text-2xl font-bold text-amber-700">{stats.pending} <span className="text-xs font-normal text-amber-600">คิว</span></span>
      </div>
      <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/60 shadow-xs">
        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">✅ คอนเฟิร์มแล้ว (Confirmed)</span>
        <span className="font-display text-2xl font-bold text-emerald-700">{stats.confirmed} <span className="text-xs font-normal text-emerald-600">คิว</span></span>
      </div>
      <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200/60 shadow-xs">
        <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">🚫 ยกเลิกแล้ว (Cancelled)</span>
        <span className="font-display text-2xl font-bold text-rose-600">{stats.cancelled} <span className="text-xs font-normal text-rose-500">คิว</span></span>
      </div>
    </div>
  );
}
