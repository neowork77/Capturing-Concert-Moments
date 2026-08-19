interface ScheduleKPIProps {
  stats: {
    totalEvents: number;
    totalSlots: number;
    availableSlots: number;
    bookedSlots: number;
  };
}

export default function ScheduleKPI({ stats }: ScheduleKPIProps) {
  const availablePercent = stats.totalSlots > 0 ? Math.round((stats.availableSlots / stats.totalSlots) * 100) : 0;
  const bookedPercent = stats.totalSlots > 0 ? Math.round((stats.bookedSlots / stats.totalSlots) * 100) : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      {/* Total Events */}
      <div className="bg-white/80 backdrop-blur-xl p-5 rounded-3xl border border-[rgba(0,0,0,0.04)] shadow-xs group hover:shadow-md hover:border-[#F4A0B5]/20 transition-all duration-300">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#F4A0B5]/15 to-[#D4B5E0]/15 flex items-center justify-center text-sm">📅</span>
          <span className="text-[10px] font-bold text-[#9E8E95] uppercase tracking-wider">งานทั้งหมด</span>
        </div>
        <span className="font-display text-2xl sm:text-3xl font-bold text-[#3D3040]">
          {stats.totalEvents} <span className="text-xs font-normal text-[#9E8E95]">วัน</span>
        </span>
      </div>

      {/* Total Slots */}
      <div className="bg-white/80 backdrop-blur-xl p-5 rounded-3xl border border-[rgba(0,0,0,0.04)] shadow-xs group hover:shadow-md hover:border-[#D4B5E0]/20 transition-all duration-300">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#D4B5E0]/15 to-[#C8DFF5]/15 flex items-center justify-center text-sm">⏰</span>
          <span className="text-[10px] font-bold text-[#9E8E95] uppercase tracking-wider">รอบเวลาทั้งหมด</span>
        </div>
        <span className="font-display text-2xl sm:text-3xl font-bold text-[#3D3040]">
          {stats.totalSlots} <span className="text-xs font-normal text-[#9E8E95]">รอบ</span>
        </span>
      </div>

      {/* Available Slots */}
      <div className="bg-emerald-50/60 p-5 rounded-3xl border border-emerald-100/80 shadow-xs group hover:shadow-md hover:border-emerald-200 transition-all duration-300">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center text-sm">🟢</span>
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">ว่าง</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-500 bg-emerald-100/80 px-2 py-0.5 rounded-full">
            {availablePercent}%
          </span>
        </div>
        <span className="font-display text-2xl sm:text-3xl font-bold text-emerald-700">
          {stats.availableSlots} <span className="text-xs font-normal text-emerald-600">รอบ</span>
        </span>
        {/* Mini progress bar */}
        <div className="mt-2 h-1.5 bg-emerald-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${availablePercent}%` }}
          />
        </div>
      </div>

      {/* Booked Slots */}
      <div className="bg-rose-50/60 p-5 rounded-3xl border border-rose-100/80 shadow-xs group hover:shadow-md hover:border-rose-200 transition-all duration-300">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-rose-100 flex items-center justify-center text-sm">🔴</span>
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">เต็มแล้ว</span>
          </div>
          <span className="text-[10px] font-bold text-rose-500 bg-rose-100/80 px-2 py-0.5 rounded-full">
            {bookedPercent}%
          </span>
        </div>
        <span className="font-display text-2xl sm:text-3xl font-bold text-rose-600">
          {stats.bookedSlots} <span className="text-xs font-normal text-rose-500">รอบ</span>
        </span>
        {/* Mini progress bar */}
        <div className="mt-2 h-1.5 bg-rose-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full transition-all duration-500"
            style={{ width: `${bookedPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
