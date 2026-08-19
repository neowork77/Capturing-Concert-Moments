import { ScheduleRecord } from '@/lib/schedule-service';
import { useState } from 'react';

interface ScheduleFormProps {
  editingSchedule: ScheduleRecord | null;
  formData: {
    date: string;
    dates: string[];
    status: string;
    eventName: string;
    location: string;
    imageUrl: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    date: string;
    dates: string[];
    status: string;
    eventName: string;
    location: string;
    imageUrl: string;
  }>>;
  isSaving: boolean;
  handleSave: (e: React.FormEvent) => void;
  onClose: () => void;
}

export default function ScheduleForm({
  editingSchedule,
  formData,
  setFormData,
  isSaving,
  handleSave,
  onClose,
}: ScheduleFormProps) {
  const [imageError, setImageError] = useState(false);
  const [pickerDate, setPickerDate] = useState<string>(formData.date || '');

  const handleAddDateStr = (dateStr: string) => {
    if (!dateStr) return;
    if (!formData.dates.includes(dateStr)) {
      const updated = [...formData.dates, dateStr].sort();
      setFormData(prev => ({
        ...prev,
        dates: updated,
        date: updated[0] || dateStr,
      }));
    }
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPickerDate(val);
    if (val) {
      handleAddDateStr(val);
    }
  };

  const handleAddNextDay = () => {
    const lastDateStr =
      formData.dates[formData.dates.length - 1] ||
      pickerDate ||
      new Date().toISOString().split('T')[0];
    
    const parts = lastDateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      d.setDate(d.getDate() + 1);
      
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const nextDateStr = `${yyyy}-${mm}-${dd}`;

      handleAddDateStr(nextDateStr);
      setPickerDate(nextDateStr);
    }
  };

  const handleRemoveDate = (targetDate: string) => {
    const updated = formData.dates.filter(d => d !== targetDate);
    setFormData(prev => ({
      ...prev,
      dates: updated,
      date: updated[0] || '',
    }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl sm:rounded-[2rem] max-w-xl sm:max-w-2xl w-full p-5 sm:p-8 shadow-2xl border border-[rgba(0,0,0,0.06)] relative max-h-[90vh] sm:max-h-[85vh] flex flex-col my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 w-8 h-8 rounded-full border border-[rgba(0,0,0,0.08)] flex items-center justify-center text-[#9E8E95] hover:text-[#3D3040] hover:bg-neutral-50 transition-all cursor-pointer z-10"
        >
          ✕
        </button>

        {/* Header (Fixed Top) */}
        <div className="flex items-center gap-3 mb-4 sm:mb-6 pr-8 flex-shrink-0">
          <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#F4A0B5]/20 to-[#D4B5E0]/20 flex items-center justify-center text-lg flex-shrink-0">
            {editingSchedule ? '✏️' : '✨'}
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-lg sm:text-xl font-bold text-[#3D3040] truncate">
              {editingSchedule ? 'แก้ไขข้อมูลคิวงาน' : 'เพิ่มวันคิวงานใหม่'}
            </h3>
            <p className="text-xs text-[#9E8E95] mt-0.5 truncate">
              {editingSchedule
                ? 'อัปเดตข้อมูลของวันงานนี้'
                : 'เลือกวันที่จัดงานคอนเสิร์ต (เลือกกี่วันก็ได้) และรายละเอียดงาน'}
            </p>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSave} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Scrollable Form Content */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1.5 sm:pr-2 pb-2 space-y-4 [overscroll-behavior:contain] [-webkit-overflow-scrolling:touch] [touch-action:pan-y]">
            
            {/* Multi-Date Selection (Both Create & Edit Mode) */}
            <div className="space-y-2.5 bg-[#FFFBFC] p-3.5 sm:p-4 rounded-2xl border border-[rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label className="flex items-center gap-1.5 text-xs font-bold text-[#3D3040] uppercase">
                  <span>📅</span> วันที่จัดงาน {formData.dates.length > 0 ? `(${formData.dates.length} วัน)` : ''}
                </label>
                <span className="text-[10px] text-[#F4A0B5] font-semibold">
                  ✦ เพิ่ม/จัดการวันที่จัดงานด้านล่าง
                </span>
              </div>

              {/* Date Picker Input & Quick Add Controls */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <input
                  type="date"
                  value={pickerDate}
                  onChange={handlePickerChange}
                  className="px-3 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs text-[#3D3040] bg-white focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => handleAddDateStr(pickerDate)}
                  className="px-3 py-2 rounded-xl bg-white border border-[rgba(0,0,0,0.1)] text-xs font-semibold text-[#3D3040] hover:bg-neutral-50 transition-all cursor-pointer shadow-2xs"
                >
                  + เพิ่มวันที่
                </button>
                <button
                  type="button"
                  onClick={handleAddNextDay}
                  className="px-3.5 py-2 rounded-xl bg-[#F4A0B5]/10 border border-[#F4A0B5]/30 text-xs font-bold text-[#F4A0B5] hover:bg-[#F4A0B5]/20 transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                >
                  <span>⚡ + เพิ่มวันถัดไป</span>
                </button>
              </div>

              {/* Added Dates Chips List */}
              {formData.dates.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {formData.dates.map((dateStr) => (
                    <span
                      key={dateStr}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#F4A0B5]/30 shadow-2xs text-xs font-bold font-mono text-[#3D3040]"
                    >
                      <span>🗓️ {dateStr}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDate(dateStr)}
                        className="text-[#9E8E95] hover:text-rose-500 font-sans cursor-pointer text-xs ml-1 transition-colors"
                        title="ลบวันที่นี้"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-[#9E8E95] italic pt-1">
                  💡 ยังไม่ได้เลือกวันที่ — กรุณาคลิกเลือกวันที่จัดงานในช่องปฏิทินด้านบน
                </p>
              )}
            </div>


            {/* Row 2: Status & Event Name */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
              {/* Status Field */}
              <div className="group">
                <label className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-[#9E8E95] uppercase mb-1 sm:mb-1.5">
                  <span className="text-xs sm:text-sm">🏷️</span> สถานะตั้งต้น
                </label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-2.5 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-[11px] sm:text-sm text-[#3D3040] bg-[#FFFBFC] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40 focus:border-[#F4A0B5]/50 transition-all cursor-pointer"
                >
                  <option value="available">🟢 เปิดรับคิว</option>
                  <option value="full">🔴 คิวเต็ม</option>
                  <option value="unavailable">⚫ ปิดรับคิว</option>
                </select>
              </div>

              {/* Event Name */}
              <div className="group">
                <label className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-[#9E8E95] uppercase mb-1 sm:mb-1.5">
                  <span className="text-xs sm:text-sm">🎤</span> ชื่อ Event / คอนเสิร์ต
                </label>
                <input
                  type="text"
                  placeholder="เช่น ITZY 3rd World Tour"
                  value={formData.eventName}
                  onChange={e => setFormData({ ...formData, eventName: e.target.value })}
                  className="w-full px-2.5 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-[11px] sm:text-sm text-[#3D3040] bg-[#FFFBFC] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40 focus:border-[#F4A0B5]/50 transition-all placeholder:text-[#C8BBC0]"
                />
              </div>
            </div>

            {/* Location */}
            <div className="group">
              <label className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-[#9E8E95] uppercase mb-1 sm:mb-1.5">
                <span className="text-xs sm:text-sm">📍</span> สถานที่จัดงาน
              </label>
              <input
                type="text"
                placeholder="เช่น Impact Arena, เมืองทองธานี"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-2.5 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-[11px] sm:text-sm text-[#3D3040] bg-[#FFFBFC] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40 focus:border-[#F4A0B5]/50 transition-all placeholder:text-[#C8BBC0]"
              />
            </div>

            {/* Image URL + Preview */}
            <div className="group">
              <label className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-[#9E8E95] uppercase mb-1 sm:mb-1.5">
                <span className="text-xs sm:text-sm">🖼️</span> Image URL (รูปโปสเตอร์คอนเสิร์ต)
              </label>
              <input
                type="url"
                placeholder="https://example.com/poster.jpg"
                value={formData.imageUrl}
                onChange={e => {
                  setFormData({ ...formData, imageUrl: e.target.value });
                  setImageError(false);
                }}
                className="w-full px-2.5 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-[11px] sm:text-sm text-[#3D3040] bg-[#FFFBFC] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40 focus:border-[#F4A0B5]/50 transition-all placeholder:text-[#C8BBC0]"
              />

              {/* Image Preview */}
              {formData.imageUrl && (
                <div className="mt-3 p-3 rounded-2xl bg-[#FFFBFC] border border-[rgba(0,0,0,0.06)]">
                  <span className="text-[10px] font-bold text-[#9E8E95] uppercase tracking-wider mb-2 block">
                    ตัวอย่างรูป:
                  </span>
                  {imageError ? (
                    <div className="w-full h-28 sm:h-36 rounded-xl bg-rose-50 border border-rose-200 flex flex-col items-center justify-center gap-1 text-rose-400 p-2 text-center">
                      <span className="text-xl sm:text-2xl">⚠️</span>
                      <span className="text-xs font-medium">ไม่สามารถโหลดรูปได้ — ตรวจสอบ URL</span>
                    </div>
                  ) : (
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      onError={() => setImageError(true)}
                      className="w-full max-h-28 sm:max-h-48 object-contain rounded-xl border border-[rgba(0,0,0,0.08)] shadow-2xs"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions (Fixed Bottom) */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-[rgba(0,0,0,0.06)] flex-shrink-0 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs font-medium text-[#9E8E95] hover:bg-neutral-50 hover:text-[#3D3040] transition-all cursor-pointer text-center"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F4A0B5] to-[#D4B5E0] hover:from-[#F4A0B5]/90 hover:to-[#D4B5E0]/90 text-white text-xs font-semibold shadow-md cursor-pointer disabled:opacity-60 transition-all flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>💾 บันทึกคิวงาน {!editingSchedule && formData.dates.length > 0 ? `(${formData.dates.length} วัน)` : ''}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
