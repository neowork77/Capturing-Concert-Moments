import { useState, useEffect } from 'react';
import type { CameraRecord } from '@/shared/services/camera-service';
import type { ScheduleRecord } from '@/shared/types/schedule';
import type { BookingRecord } from '@/shared/services/booking-service';

import { updateBookingFullAction } from '@/features/admin/actions/booking-actions';
import { alertDialog } from '@/features/admin/components/ui';

interface BookingEditModalProps {
  booking: BookingRecord;
  cameras: CameraRecord[];
  schedules: ScheduleRecord[];
  onClose: () => void;
  onSuccess: (updated: BookingRecord) => void;
}

export default function BookingEditModal({
  booking,
  cameras,
  schedules,
  onClose,
  onSuccess,
}: BookingEditModalProps) {
  const [formData, setFormData] = useState({
    customerName: booking.customerName || '',
    customerPhone: booking.customerPhone || '',
    lineDisplayName: booking.lineDisplayName || '',
    eventName: booking.eventName || '',
    date: booking.date || '',
    timeSlot: booking.timeSlot || '',
    cameraType: booking.cameraType || '',
    status: booking.status || 'pending',
    paymentStatus: booking.paymentStatus || 'unpaid',
    depositAmount: booking.depositAmount ?? 0,
    remainingAmount: booking.remainingAmount ?? 0,
    notes: booking.notes || '',
  });

  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Match existing schedule
  useEffect(() => {
    if (booking.eventName && schedules.length > 0) {
      const match = schedules.find(
        s =>
          (s.eventName || '').trim() === booking.eventName.trim() &&
          s.date.trim() === booking.date.trim()
      );
      if (match) {
        setSelectedScheduleId(String(match.id));
      } else {
        setSelectedScheduleId('custom');
      }
    } else {
      setSelectedScheduleId('custom');
    }
  }, [booking, schedules]);

  const activeSchedule = schedules.find(s => String(s.id) === selectedScheduleId);

  const handleSelectSchedule = (val: string) => {
    setSelectedScheduleId(val);
    if (val === 'custom' || !val) {
      return;
    }
    const sched = schedules.find(s => String(s.id) === val);
    if (sched) {
      setFormData(prev => ({
        ...prev,
        eventName: sched.eventName || '',
        date: sched.date,
        // Keep current slot if it exists in new schedule, otherwise select first available
        timeSlot: sched.slots.some(s => s.time === prev.timeSlot)
          ? prev.timeSlot
          : sched.slots[0]?.time || prev.timeSlot,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName.trim() || !formData.customerPhone.trim()) {
      await alertDialog({ title: 'กรุณากรอกชื่อและเบอร์โทรศัพท์ลูกค้า', danger: true });
      return;
    }
    if (!formData.date || !formData.timeSlot) {
      await alertDialog({ title: 'กรุณาระบุวันที่และรอบเวลา', danger: true });
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateBookingFullAction(booking.id, {
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        lineDisplayName: formData.lineDisplayName || null,
        eventName: formData.eventName,
        date: formData.date,
        timeSlot: formData.timeSlot,
        cameraType: formData.cameraType || null,
        status: formData.status as 'pending' | 'confirmed' | 'cancelled',
        paymentStatus: formData.paymentStatus as 'unpaid' | 'deposit' | 'paid',
        depositAmount: formData.depositAmount,
        remainingAmount: formData.remainingAmount,
        notes: formData.notes || null,
      });

      if (res.success && res.data) {
        onSuccess(res.data);
      } else {
        await alertDialog({ title: res.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลการจอง', danger: true });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        data-lenis-prevent
        className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full p-4 sm:p-7 shadow-2xl border border-[rgba(0,0,0,0.06)] relative max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] flex flex-col my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 w-8 h-8 rounded-full border border-[rgba(0,0,0,0.08)] flex items-center justify-center text-[var(--ink-muted)] hover:text-[#3D3040] hover:bg-neutral-50 transition-all cursor-pointer z-10"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 sm:mb-5 pr-8 flex-shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#F4A0B5]/20 to-[#D4B5E0]/20 flex items-center justify-center text-lg flex-shrink-0">
            ✏️
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg sm:text-xl font-bold text-[#3D3040] truncate">
                แก้ไขข้อมูลการจอง
              </h3>
              <span className="font-mono text-xs font-bold text-[#F4A0B5] bg-[#F4A0B5]/10 px-2 py-0.5 rounded-md">
                #BK-{booking.id}
              </span>
            </div>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5 truncate">
              แก้ไขข้อมูลลูกค้า คอนเสิร์ต วันที่ รอบเวลา รุ่นกล้อง และการชำระเงิน
            </p>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto pr-1.5 sm:pr-2 pb-2 space-y-3.5 sm:space-y-4 [overscroll-behavior:contain] [-webkit-overflow-scrolling:touch]">
            
            {/* Section 1: Customer Info */}
            <div className="p-3.5 rounded-2xl bg-[#FFFBFC] border border-[rgba(0,0,0,0.06)] space-y-3">
              <span className="text-xs font-bold text-[#3D3040] flex items-center gap-1.5">
                <span>👤</span> ข้อมูลลูกค้า
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-micro sm:text-xs font-bold text-[var(--ink-muted)] mb-1">
                    ชื่อลูกค้า *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น คิมโดยอง"
                    value={formData.customerName}
                    onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs sm:text-sm text-[#3D3040] bg-white focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                  />
                </div>

                <div>
                  <label className="block text-micro sm:text-xs font-bold text-[var(--ink-muted)] mb-1">
                    เบอร์โทรศัพท์ *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0812345678"
                    value={formData.customerPhone}
                    onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs sm:text-sm text-[#3D3040] bg-white focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-micro sm:text-xs font-bold text-[var(--ink-muted)] mb-1">
                  ชื่อ LINE (LINE Display Name)
                </label>
                <input
                  type="text"
                  placeholder="เช่น Doyoung_KIM"
                  value={formData.lineDisplayName}
                  onChange={e => setFormData({ ...formData, lineDisplayName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs sm:text-sm text-[#3D3040] bg-white focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                />
              </div>
            </div>

            {/* Section 2: Event, Date & Slot */}
            <div className="p-3.5 rounded-2xl bg-[#FFFBFC] border border-[rgba(0,0,0,0.06)] space-y-3">
              <span className="text-xs font-bold text-[#3D3040] flex items-center gap-1.5">
                <span>🎤</span> คอนเสิร์ต & วันเวลารอบ
              </span>

              {/* Concert Selector */}
              <div>
                <label className="block text-micro sm:text-xs font-bold text-[var(--ink-muted)] mb-1">
                  เลือกคอนเสิร์ตในระบบ
                </label>
                <select
                  value={selectedScheduleId}
                  onChange={e => handleSelectSchedule(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#F4A0B5]/40 text-xs sm:text-sm font-semibold text-[#3D3040] bg-white focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40 cursor-pointer"
                >
                  {schedules.map(sched => (
                    <option key={sched.id} value={sched.id}>
                      🎤 {sched.eventName || 'ไม่มีชื่องาน'} (📅 {sched.date})
                    </option>
                  ))}
                  <option value="custom">✍️ ระบุชื่องานเอง (Custom Event)</option>
                </select>
              </div>

              {/* Custom Event Name (if custom) */}
              {(selectedScheduleId === 'custom' || !activeSchedule) && (
                <div>
                  <label className="block text-micro sm:text-xs font-bold text-[var(--ink-muted)] mb-1">
                    ชื่อคอนเสิร์ต / Event Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.eventName}
                    onChange={e => setFormData({ ...formData, eventName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs sm:text-sm text-[#3D3040] bg-white focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                  />
                </div>
              )}

              {/* Date & Time Slot Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-micro sm:text-xs font-bold text-[var(--ink-muted)] mb-1">
                    วันที่ (YYYY-MM-DD) *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs sm:text-sm text-[#3D3040] bg-white focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                  />
                </div>

                <div>
                  <label className="block text-micro sm:text-xs font-bold text-[var(--ink-muted)] mb-1">
                    รอบเวลา (Time Slot) *
                  </label>
                  {activeSchedule && activeSchedule.slots.length > 0 ? (
                    <div className="space-y-1.5">
                      <select
                        value={formData.timeSlot}
                        onChange={e => setFormData({ ...formData, timeSlot: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs sm:text-sm text-[#3D3040] bg-white focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40 cursor-pointer"
                      >
                        {activeSchedule.slots.map(slot => (
                          <option key={slot.time} value={slot.time}>
                            ⏰ {slot.time}
                          </option>
                        ))}
                        <option value={formData.timeSlot}>
                          ⏰ ปัจจุบัน: {formData.timeSlot}
                        </option>
                      </select>
                    </div>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="เช่น 12:00-12:20"
                      value={formData.timeSlot}
                      onChange={e => setFormData({ ...formData, timeSlot: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs sm:text-sm text-[#3D3040] bg-white focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                    />
                  )}
                </div>
              </div>

              {/* Camera Selector */}
              <div>
                <label className="block text-micro sm:text-xs font-bold text-[var(--ink-muted)] mb-1">
                  เลือกรุ่นกล้อง *
                </label>
                {cameras.length > 0 ? (
                  <select
                    value={formData.cameraType}
                    onChange={e => setFormData({ ...formData, cameraType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs sm:text-sm text-[#3D3040] bg-white focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40 cursor-pointer"
                  >
                    {cameras.map(cam => (
                      <option key={cam.id} value={cam.name}>
                        📷 {cam.name} ({cam.priceInfo})
                      </option>
                    ))}
                    {!cameras.some(c => c.name === formData.cameraType) && formData.cameraType && (
                      <option value={formData.cameraType}>
                        📷 {formData.cameraType} (กำหนดเอง)
                      </option>
                    )}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="เช่น RICOH GR IIIx + Flash"
                    value={formData.cameraType}
                    onChange={e => setFormData({ ...formData, cameraType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs sm:text-sm text-[#3D3040] bg-white focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                  />
                )}
              </div>
            </div>

            {/* Section 3: Status & Payment */}
            <div className="p-3.5 rounded-2xl bg-[#FFFBFC] border border-[rgba(0,0,0,0.06)] space-y-3">
              <span className="text-xs font-bold text-[#3D3040] flex items-center gap-1.5">
                <span>💰</span> สถานะการจอง & การชำระเงิน
              </span>

              {/* Booking Status Buttons */}
              <div>
                <label className="block text-micro sm:text-xs font-bold text-[var(--ink-muted)] mb-1">
                  สถานะคิวการจอง
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['pending', 'confirmed', 'cancelled'] as const).map(s => {
                    const isSelected = formData.status === s;
                    const labels = {
                      pending: '⏳ รอคอนเฟิร์ม',
                      confirmed: '✅ คอนเฟิร์มแล้ว',
                      cancelled: '🚫 ยกเลิก',
                    };
                    const activeClasses = {
                      pending: 'bg-amber-500 text-white border-amber-500',
                      confirmed: 'bg-emerald-600 text-white border-emerald-600',
                      cancelled: 'bg-rose-500 text-white border-rose-500',
                    };
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFormData({ ...formData, status: s })}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                          isSelected
                            ? activeClasses[s]
                            : 'bg-white text-[var(--ink-muted)] border-[rgba(0,0,0,0.1)] hover:bg-neutral-50'
                        }`}
                      >
                        {labels[s]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payment Status Buttons */}
              <div>
                <label className="block text-micro sm:text-xs font-bold text-[var(--ink-muted)] mb-1">
                  สถานะการชำระเงิน
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['unpaid', 'deposit', 'paid'] as const).map(p => {
                    const isSelected = formData.paymentStatus === p;
                    const labels = {
                      unpaid: '⚫ ยังไม่ชำระ',
                      deposit: '🟡 มัดจำ',
                      paid: '✅ จ่ายเต็ม',
                    };
                    const activeClasses = {
                      unpaid: 'bg-neutral-600 text-white border-neutral-600',
                      deposit: 'bg-amber-500 text-white border-amber-500',
                      paid: 'bg-emerald-600 text-white border-emerald-600',
                    };
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          if (p === 'unpaid') {
                            setFormData({ ...formData, paymentStatus: p, depositAmount: 0, remainingAmount: 0 });
                          } else if (p === 'paid') {
                            setFormData({ ...formData, paymentStatus: p, remainingAmount: 0 });
                          } else {
                            setFormData({ ...formData, paymentStatus: p });
                          }
                        }}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                          isSelected
                            ? activeClasses[p]
                            : 'bg-white text-[var(--ink-muted)] border-[rgba(0,0,0,0.1)] hover:bg-neutral-50'
                        }`}
                      >
                        {labels[p]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amounts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-micro sm:text-xs font-bold text-[var(--ink-muted)] mb-1">
                    ยอดเงินมัดจำ (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.depositAmount || ''}
                    onChange={e =>
                      setFormData({ ...formData, depositAmount: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs sm:text-sm text-[#3D3040] bg-white focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                  />
                </div>

                <div>
                  <label className="block text-micro sm:text-xs font-bold text-[var(--ink-muted)] mb-1">
                    ยอดเงินคงเหลือที่ต้องชำระ (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.remainingAmount || ''}
                    onChange={e =>
                      setFormData({ ...formData, remainingAmount: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs sm:text-sm text-[#3D3040] bg-white focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Notes */}
            <div>
              <label className="block text-micro sm:text-xs font-bold text-[var(--ink-muted)] mb-1">
                📝 หมายเหตุเพิ่มเติม (Notes)
              </label>
              <textarea
                rows={3}
                placeholder="เช่น ขาตั้งกล้อง, โอนสลิปแล้ว ฯลฯ"
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs sm:text-sm text-[#3D3040] bg-white focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
              />
            </div>

          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3.5 border-t border-[rgba(0,0,0,0.06)] flex-shrink-0 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs font-medium text-[var(--ink-muted)] hover:bg-neutral-50 cursor-pointer transition-all"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#F4A0B5] to-[#D4B5E0] hover:from-[#F4A0B5]/90 hover:to-[#D4B5E0]/90 text-white text-xs font-semibold shadow-md cursor-pointer disabled:opacity-60 transition-all flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                '💾 บันทึกการแก้ไข'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

