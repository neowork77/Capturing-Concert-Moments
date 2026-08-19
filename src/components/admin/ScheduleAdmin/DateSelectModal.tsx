'use client';

import { ScheduleRecord } from '@/lib/schedule-service';

export interface ConcertGroup {
  eventName: string;
  location: string;
  imageUrl: string | null;
  schedules: ScheduleRecord[];
}

interface DateSelectModalProps {
  group: ConcertGroup;
  onClose: () => void;
  onSelectSlot: (schedule: ScheduleRecord) => void;
  onEdit: (schedule: ScheduleRecord) => void;
  onDelete: (id: number, dateStr: string) => void;
  deletingId: number | null;
}

export default function DateSelectModal({
  group,
  onClose,
  onSelectSlot,
  onEdit,
  onDelete,
  deletingId,
}: DateSelectModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl sm:rounded-[2rem] max-w-md w-full p-5 sm:p-8 shadow-2xl border border-[rgba(0,0,0,0.06)] relative max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Concert Header Banner (Pinned Header) */}
        <div className="flex gap-4 items-center pb-4 mb-4 border-b border-[rgba(0,0,0,0.06)] flex-shrink-0">
          <div className="w-16 h-20 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0 border border-[rgba(0,0,0,0.08)] shadow-2xs">
            {group.imageUrl ? (
              <img
                src={group.imageUrl}
                alt={group.eventName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#FFFBFC] to-[#F4A0B5]/20 flex items-center justify-center text-xl text-[#F4A0B5]">
                🎤
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span className="px-2.5 py-0.5 rounded-full bg-[#F4A0B5]/10 text-[#F4A0B5] font-bold text-[10px] uppercase tracking-wider">
              🗓️ เลือกวันจัดแสดง ({group.schedules.length} วัน)
            </span>
            <h3 className="font-bold text-base text-[#3D3040] leading-snug truncate mt-1">
              {group.eventName || 'ไม่ได้ระบุชื่องาน'}
            </h3>
            <p className="text-xs text-[#9E8E95] mt-0.5 flex items-center gap-1 font-light truncate">
              <span>📍</span>
              <span className="truncate">{group.location || 'ไม่ได้ระบุสถานที่'}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[rgba(0,0,0,0.08)] flex items-center justify-center text-[#9E8E95] hover:text-[#3D3040] hover:bg-neutral-100 transition-colors cursor-pointer text-sm flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Date Selection Buttons List (Scrollable Area) */}
        <div className="flex-1 min-h-[150px] overflow-y-auto no-scrollbar space-y-3 pr-1 py-1">
          {group.schedules.map((schedule) => {
            const availableSlots = schedule.slots.filter(s => s.status === 'available');
            const bookedSlots = schedule.slots.filter(s => s.status === 'booked');
            const totalSlots = schedule.slots.length;
            const bookedPercent = totalSlots > 0 ? Math.round((bookedSlots.length / totalSlots) * 100) : 0;

            return (
              <div
                key={schedule.id}
                className="p-4 rounded-2xl bg-[#FFFBFC] border border-[rgba(0,0,0,0.06)] hover:border-[#F4A0B5]/50 transition-all shadow-2xs group"
              >
                {/* Date + Status */}
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-mono text-sm font-bold text-[#3D3040]">
                      🗓️ {schedule.date}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        schedule.status === 'available'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : schedule.status === 'full'
                          ? 'bg-rose-50 text-rose-600 border-rose-200'
                          : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                      }`}
                    >
                      {schedule.status === 'available' ? 'เปิดรับ' : schedule.status === 'full' ? 'คิวเต็ม' : 'ปิดรับ'}
                    </span>
                  </div>
                </div>

                {/* Slot stats + progress bar */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 text-xs font-medium mb-1.5">
                    <span className="text-emerald-600">🟢 ว่าง {availableSlots.length}</span>
                    <span className="text-[#C8BBC0]">/</span>
                    <span className="text-rose-500">🔴 เต็ม {bookedSlots.length}</span>
                    <span className="text-[#C8BBC0] ml-auto text-[10px]">{bookedPercent}% เต็ม</span>
                  </div>
                  {/* Mini progress bar */}
                  <div className="h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full transition-all duration-500"
                      style={{ width: `${bookedPercent}%` }}
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onClose();
                      onSelectSlot(schedule);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#F4A0B5] to-[#D4B5E0] hover:from-[#F4A0B5]/90 hover:to-[#D4B5E0]/90 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1 hover:shadow-sm"
                  >
                    ⏰ จัดการรอบเวลา
                  </button>
                  <button
                    onClick={() => {
                      onClose();
                      onEdit(schedule);
                    }}
                    className="p-2 rounded-xl border border-[rgba(0,0,0,0.08)] text-[#9E8E95] hover:text-[#3D3040] hover:bg-neutral-100 transition-all cursor-pointer text-xs"
                    title="แก้ไขข้อมูลวันงาน"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => onDelete(schedule.id, schedule.date)}
                    disabled={deletingId === schedule.id}
                    className="p-2 rounded-xl border border-rose-200 text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer text-xs disabled:opacity-50"
                    title="ลบวันงานนี้"
                  >
                    {deletingId === schedule.id ? (
                      <span className="w-3 h-3 rounded-full border-2 border-rose-300 border-t-rose-500 animate-spin inline-block" />
                    ) : (
                      '🗑️'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pinned Footer */}
        <div className="mt-4 pt-3 border-t border-[rgba(0,0,0,0.06)] text-center flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs font-semibold text-[#9E8E95] hover:bg-neutral-50 hover:text-[#3D3040] transition-all cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
