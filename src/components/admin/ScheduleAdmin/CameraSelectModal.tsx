'use client';

import { CameraRecord } from '@/lib/camera-service';
import { ScheduleRecord } from '@/lib/schedule-service';

interface CameraSelectModalProps {
  schedule: ScheduleRecord;
  cameras: CameraRecord[];
  onSelect: (camera: CameraRecord) => void;
  onClose: () => void;
}

export default function CameraSelectModal({
  schedule,
  cameras,
  onSelect,
  onClose,
}: CameraSelectModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[rgba(0,0,0,0.06)] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            {schedule.imageUrl ? (
              <img
                src={schedule.imageUrl}
                alt={schedule.eventName || ''}
                className="w-12 h-16 rounded-xl object-cover border border-[rgba(0,0,0,0.08)] shadow-xs flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-16 rounded-xl bg-gradient-to-br from-[#F4A0B5]/20 to-[#D4B5E0]/30 border border-[#F4A0B5]/20 flex items-center justify-center text-[#F4A0B5] flex-shrink-0">
                <span className="text-xl">🎤</span>
              </div>
            )}
            <div>
              <span className="text-[10px] font-bold text-[#F4A0B5] uppercase tracking-wider">
                เลือกรุ่นกล้อง
              </span>
              <h3 className="font-bold text-base text-[#3D3040] leading-snug mt-0.5">
                {schedule.eventName || 'ไม่ได้ระบุชื่องาน'}
              </h3>
              <p className="text-xs text-[#9E8E95] mt-0.5">📅 {schedule.date}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[rgba(0,0,0,0.08)] flex items-center justify-center text-[#9E8E95] hover:text-[#3D3040] hover:bg-neutral-50 cursor-pointer transition-all flex-shrink-0"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-[#9E8E95] mb-4">
          เลือกรุ่นกล้องที่ต้องการดูสล็อตและคิวการจอง
        </p>

        {cameras.length === 0 ? (
          <div className="py-10 text-center">
            <span className="text-3xl mb-2 block">📸</span>
            <p className="text-sm text-[#9E8E95]">ยังไม่มีรุ่นกล้องในระบบ</p>
            <p className="text-xs text-[#C8BBC0] mt-1">เพิ่มกล้องได้ที่แท็บ "จัดการรุ่นกล้อง"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cameras.map((cam) => (
              <button
                key={cam.id}
                onClick={() => onSelect(cam)}
                className="group flex items-center gap-3 p-3.5 rounded-2xl border border-[rgba(0,0,0,0.07)] bg-[#FFFBFC] hover:border-[#F4A0B5]/50 hover:bg-gradient-to-r hover:from-[#FEE1E8] hover:to-[#FAD4E2] transition-all cursor-pointer text-left shadow-2xs hover:shadow-md"
              >
                {/* Camera image or icon */}
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-[rgba(0,0,0,0.06)] bg-neutral-100">
                  {cam.imageUrl ? (
                    <img
                      src={cam.imageUrl}
                      alt={cam.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#F4A0B5]/20 to-[#D4B5E0]/30 flex items-center justify-center text-xl">
                      📷
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#3D3040] group-hover:text-[#D4455F] transition-colors truncate">
                    {cam.name}
                  </p>
                  <p className="text-[11px] text-[#9E8E95] truncate mt-0.5">{cam.priceInfo}</p>
                </div>

                <span className="text-[#C8BBC0] group-hover:text-[#F4A0B5] text-base transition-colors flex-shrink-0">
                  →
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
