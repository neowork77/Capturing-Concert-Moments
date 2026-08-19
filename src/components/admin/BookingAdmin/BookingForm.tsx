import { CameraRecord } from '@/lib/camera-service';
import { ScheduleRecord } from '@/lib/schedule-service';
import { useState, useEffect } from 'react';

interface BookingFormProps {
  cameras: CameraRecord[];
  schedules: ScheduleRecord[];
  formData: {
    date: string;
    eventName: string;
    timeSlot: string;
    customerName: string;
    customerPhone: string;
    lineDisplayName: string;
    cameraType: string;
    notes: string;
    paymentStatus: 'unpaid' | 'deposit' | 'paid';
    depositAmount: number;
    remainingAmount: number;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    date: string;
    eventName: string;
    timeSlot: string;
    customerName: string;
    customerPhone: string;
    lineDisplayName: string;
    cameraType: string;
    notes: string;
    paymentStatus: 'unpaid' | 'deposit' | 'paid';
    depositAmount: number;
    remainingAmount: number;
  }>>;
  isSaving: boolean;
  handleCreateBooking: (e: React.FormEvent) => void;
  onClose: () => void;
}

export default function BookingForm({
  cameras,
  schedules,
  formData,
  setFormData,
  isSaving,
  handleCreateBooking,
  onClose,
}: BookingFormProps) {
  // Find matching schedule or allow custom selection
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');

  // Sync selectedScheduleId with formData on initial load
  useEffect(() => {
    if (formData.eventName && schedules.length > 0) {
      const match = schedules.find(
        s =>
          (s.eventName || '').trim() === formData.eventName.trim() &&
          (!formData.date || s.date === formData.date)
      );
      if (match) {
        setSelectedScheduleId(String(match.id));
      } else {
        setSelectedScheduleId('custom');
      }
    } else if (schedules.length > 0) {
      // Default to first schedule if none selected
      const first = schedules[0];
      setSelectedScheduleId(String(first.id));
      const defaultSlot =
        first.slots.find(s => s.status === 'available')?.time ||
        first.slots[0]?.time ||
        '12:00-12:20';
      setFormData(prev => ({
        ...prev,
        eventName: first.eventName || '',
        date: first.date,
        timeSlot: defaultSlot,
      }));
    }
  }, []);

  const activeSchedule = schedules.find(s => String(s.id) === selectedScheduleId);

  const handleSelectSchedule = (val: string) => {
    setSelectedScheduleId(val);
    if (val === 'custom' || !val) {
      return;
    }
    const sched = schedules.find(s => String(s.id) === val);
    if (sched) {
      const defaultSlot =
        sched.slots.find(s => s.status === 'available')?.time ||
        sched.slots[0]?.time ||
        '12:00-12:20';
      setFormData(prev => ({
        ...prev,
        eventName: sched.eventName || '',
        date: sched.date,
        timeSlot: defaultSlot,
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[rgba(0,0,0,0.06)] relative max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 w-8 h-8 rounded-full border border-[rgba(0,0,0,0.08)] flex items-center justify-center text-[#9E8E95] hover:text-[#3D3040] hover:bg-neutral-50 transition-all cursor-pointer z-10"
        >
          ✕
        </button>

        <h3 className="font-display text-xl font-bold text-[#3D3040] mb-4 pr-8 flex-shrink-0">
          เพิ่มรายการจองคิวใหม่ (Manual Booking)
        </h3>

        <form onSubmit={handleCreateBooking} className="flex-1 min-h-0 flex flex-col space-y-4 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
            {/* Customer Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                  ชื่อลูกค้า *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น คิมโดยอง"
                  value={formData.customerName}
                  onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                  เบอร์โทรศัพท์ (10 หลัก) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="0812345678"
                  value={formData.customerPhone}
                  onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                />
              </div>
            </div>

            {/* Concert / Event Selection */}
            <div>
              <label className="block text-xs font-bold text-[#3D3040] uppercase mb-1 flex items-center justify-between">
                <span>🎤 เลือกคอนเสิร์ตในระบบ *</span>
                {activeSchedule && (
                  <span className="text-[10px] text-[#F4A0B5] font-semibold">
                    📍 {activeSchedule.location || 'ไม่ได้ระบุสถานที่'}
                  </span>
                )}
              </label>
              {schedules.length > 0 ? (
                <select
                  value={selectedScheduleId}
                  onChange={e => handleSelectSchedule(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#F4A0B5]/40 text-sm font-semibold text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40 bg-[#FFFBFC] cursor-pointer"
                >
                  <option value="" disabled>-- กรุณาเลือกคอนเสิร์ตในระบบ --</option>
                  {schedules.map(sched => (
                    <option key={sched.id} value={sched.id}>
                      🎤 {sched.eventName || 'ไม่มีชื่องาน'} (📅 {sched.date})
                    </option>
                  ))}
                  <option value="custom">✍️ ระบุชื่องานเอง (Custom Event)</option>
                </select>
              ) : (
                <div className="text-xs text-[#9E8E95] p-2 bg-neutral-50 rounded-xl">
                  ยังไม่มีคอนเสิร์ตในระบบ — กรุณาระบุชื่องานเองด้านล่าง
                </div>
              )}
            </div>

            {/* Free-text Event Name Input (If Custom is selected or fallback) */}
            {(selectedScheduleId === 'custom' || schedules.length === 0) && (
              <div>
                <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                  ชื่องาน / Event Name (ระบุเอง) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ITZY 3rd World Tour"
                  value={formData.eventName}
                  onChange={e => setFormData({ ...formData, eventName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                />
              </div>
            )}

            {/* Date & Time Slot Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                  วันที่ (YYYY-MM-DD) *
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                  ช่วงเวลา (Time Slot) *
                </label>
                {activeSchedule && activeSchedule.slots.length > 0 ? (
                  <select
                    value={formData.timeSlot}
                    onChange={e => setFormData({ ...formData, timeSlot: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40 bg-white cursor-pointer"
                  >
                    {activeSchedule.slots.map(slot => (
                      <option key={slot.time} value={slot.time}>
                        ⏰ {slot.time} {slot.status === 'available' ? '🟢 (ว่าง)' : '🔴 (เต็ม)'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="เช่น 12:00-12:20"
                    value={formData.timeSlot}
                    onChange={e => setFormData({ ...formData, timeSlot: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                  />
                )}
              </div>
            </div>

            {/* Camera Selection */}
            <div>
              <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                เลือกกล้อง (Camera Type) *
              </label>
              {cameras.length > 0 ? (
                <select
                  value={formData.cameraType}
                  onChange={e => setFormData({ ...formData, cameraType: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40 bg-white cursor-pointer"
                >
                  {cameras.map(cam => (
                    <option key={cam.id} value={cam.name}>
                      📷 {cam.name} ({cam.priceInfo})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  placeholder="เช่น RICOH GR IIIx + Flash"
                  value={formData.cameraType}
                  onChange={e => setFormData({ ...formData, cameraType: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                />
              )}
            </div>

            {/* LINE Display Name */}
            <div>
              <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                ชื่อไลน์ (Optional)
              </label>
              <input
                type="text"
                placeholder="เช่น Doyoung_KIM"
                value={formData.lineDisplayName}
                onChange={e => setFormData({ ...formData, lineDisplayName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
              />
            </div>

            {/* Payment Status Selector */}
            <div>
              <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                💰 สถานะการชำระเงิน
              </label>
              <div className="flex items-center gap-2">
                {(['unpaid', 'deposit', 'paid'] as const).map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      if (val === 'unpaid') {
                        setFormData({ ...formData, paymentStatus: val, depositAmount: 0, remainingAmount: 0 });
                      } else if (val === 'paid') {
                        setFormData({ ...formData, paymentStatus: val, remainingAmount: 0 });
                      } else {
                        setFormData({ ...formData, paymentStatus: val });
                      }
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      formData.paymentStatus === val
                        ? val === 'unpaid'
                          ? 'bg-neutral-500 text-white border-neutral-400'
                          : val === 'deposit'
                          ? 'bg-amber-400 text-white border-amber-300'
                          : 'bg-emerald-500 text-white border-emerald-400'
                        : 'bg-white text-neutral-400 border-[rgba(0,0,0,0.1)] hover:bg-neutral-50'
                    }`}
                  >
                    {val === 'unpaid' ? '⚫ ยังไม่มัดจำ' : val === 'deposit' ? '🟡 มัดจำ' : '✅ จ่ายเต็ม'}
                  </button>
                ))}
              </div>
            </div>

            {/* Deposit & Remaining Amount Inputs */}
            {formData.paymentStatus === 'deposit' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                    💵 จำนวนเงินมัดจำ (บาท)
                  </label>
                  <input
                    type="number"
                    placeholder="เช่น 500"
                    value={formData.depositAmount || ''}
                    onChange={e => setFormData({ ...formData, depositAmount: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                    💵 ยอดต้องเก็บเพิ่มอีก (บาท)
                  </label>
                  <input
                    type="number"
                    placeholder="เช่น 1500"
                    value={formData.remainingAmount || ''}
                    onChange={e => setFormData({ ...formData, remainingAmount: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                  />
                </div>
              </div>
            )}

            {formData.paymentStatus === 'paid' && (
              <div>
                <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                  💵 จำนวนเงินที่ชำระแล้ว (บาท)
                </label>
                <input
                  type="number"
                  placeholder="เช่น 2000"
                  value={formData.depositAmount || ''}
                  onChange={e => setFormData({ ...formData, depositAmount: parseInt(e.target.value, 10) || 0, remainingAmount: 0 })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                />
              </div>
            )}
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgba(0,0,0,0.06)] flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs font-medium text-[#9E8E95] hover:bg-neutral-50 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-[#F4A0B5] hover:bg-[#F4A0B5]/90 text-white text-xs font-semibold shadow-md cursor-pointer disabled:opacity-60"
            >
              {isSaving ? 'กำลังบันทึก...' : 'บันทึกรายการจอง'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
